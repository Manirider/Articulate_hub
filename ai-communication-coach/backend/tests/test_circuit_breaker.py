"""Tests for circuit breaker pattern (app/core/circuit_breaker.py)."""
import time
import pytest
from unittest.mock import AsyncMock, patch

from app.core.circuit_breaker import (
    CircuitBreaker,
    CircuitBreakerOpenError,
    CircuitState,
    openai_breaker,
    gladia_breaker,
    ollama_breaker,
    circuit_breaker,
)


class TestCircuitBreakerStates:
    def test_initial_state_is_closed(self):
        cb = CircuitBreaker(name="test")
        assert cb.state == CircuitState.CLOSED
        assert cb.failure_count == 0

    def test_get_state_returns_dict(self):
        cb = CircuitBreaker(name="test_cb")
        state = cb.get_state()
        assert state["name"] == "test_cb"
        assert state["state"] == "closed"
        assert state["failure_count"] == 0
        assert state["success_count"] == 0
        assert state["last_failure_time"] is None


class TestCircuitBreakerCall:
    @pytest.mark.asyncio
    async def test_successful_call(self):
        cb = CircuitBreaker(name="test", failure_threshold=3)
        func = AsyncMock(return_value="ok")
        result = await cb.call(func)
        assert result == "ok"
        func.assert_called_once()

    @pytest.mark.asyncio
    async def test_failure_increments_count(self):
        cb = CircuitBreaker(name="test", failure_threshold=3)
        func = AsyncMock(side_effect=Exception("fail"))
        with pytest.raises(Exception):
            await cb.call(func)
        assert cb.failure_count == 1

    @pytest.mark.asyncio
    async def test_opens_after_threshold(self):
        cb = CircuitBreaker(name="test", failure_threshold=2)
        func = AsyncMock(side_effect=Exception("fail"))

        for _ in range(2):
            with pytest.raises(Exception):
                await cb.call(func)

        assert cb.state == CircuitState.OPEN

    @pytest.mark.asyncio
    async def test_open_circuit_rejects_calls(self):
        cb = CircuitBreaker(name="test", failure_threshold=1)
        func = AsyncMock(side_effect=Exception("fail"))

        # Trip the breaker
        with pytest.raises(Exception):
            await cb.call(func)

        assert cb.state == CircuitState.OPEN

        # Next call should be rejected immediately
        with pytest.raises(CircuitBreakerOpenError):
            await cb.call(func)

    @pytest.mark.asyncio
    async def test_recovery_to_half_open(self):
        cb = CircuitBreaker(name="test", failure_threshold=1, recovery_timeout=0.01)
        func = AsyncMock(side_effect=Exception("fail"))

        # Trip the breaker
        with pytest.raises(Exception):
            await cb.call(func)

        assert cb.state == CircuitState.OPEN

        # Wait for recovery timeout
        import asyncio
        await asyncio.sleep(0.02)

        # Next call should go through (HALF_OPEN)
        func.side_effect = None
        func.return_value = "recovered"
        result = await cb.call(func)
        assert result == "recovered"

    @pytest.mark.asyncio
    async def test_half_open_success_closes(self):
        cb = CircuitBreaker(
            name="test", failure_threshold=1,
            recovery_timeout=0.01, half_open_max_calls=1
        )
        func = AsyncMock(side_effect=Exception("fail"))

        # Trip
        with pytest.raises(Exception):
            await cb.call(func)
        assert cb.state == CircuitState.OPEN

        import asyncio
        await asyncio.sleep(0.02)

        # Success in half-open => closed
        func.side_effect = None
        func.return_value = "ok"
        await cb.call(func)
        assert cb.state == CircuitState.CLOSED
        assert cb.failure_count == 0

    @pytest.mark.asyncio
    async def test_half_open_failure_reopens(self):
        cb = CircuitBreaker(
            name="test", failure_threshold=1,
            recovery_timeout=0.01, half_open_max_calls=3
        )
        func = AsyncMock(side_effect=Exception("fail"))

        # Trip
        with pytest.raises(Exception):
            await cb.call(func)

        import asyncio
        await asyncio.sleep(0.02)

        # Failure in half-open => re-opens
        with pytest.raises(Exception):
            await cb.call(func)
        assert cb.state == CircuitState.OPEN

    @pytest.mark.asyncio
    async def test_success_resets_failure_count(self):
        cb = CircuitBreaker(name="test", failure_threshold=5)
        fail_func = AsyncMock(side_effect=Exception("fail"))
        ok_func = AsyncMock(return_value="ok")

        # Accumulate some failures but not enough to trip
        with pytest.raises(Exception):
            await cb.call(fail_func)
        assert cb.failure_count == 1

        # Success resets
        await cb.call(ok_func)
        assert cb.failure_count == 0


class TestCircuitBreakerDecorator:
    @pytest.mark.asyncio
    async def test_decorator_wraps_function(self):
        cb = CircuitBreaker(name="deco_test", failure_threshold=3)

        @circuit_breaker(cb)
        async def my_service():
            return "hello"

        result = await my_service()
        assert result == "hello"

    @pytest.mark.asyncio
    async def test_decorator_trips_on_failures(self):
        cb = CircuitBreaker(name="deco_trip", failure_threshold=1)

        @circuit_breaker(cb)
        async def failing_service():
            raise ValueError("service down")

        with pytest.raises(ValueError):
            await failing_service()

        assert cb.state == CircuitState.OPEN


class TestGlobalBreakers:
    def test_openai_breaker_configured(self):
        state = openai_breaker.get_state()
        assert state["name"] == "openai"

    def test_gladia_breaker_configured(self):
        state = gladia_breaker.get_state()
        assert state["name"] == "gladia"

    def test_ollama_breaker_configured(self):
        state = ollama_breaker.get_state()
        assert state["name"] == "ollama"

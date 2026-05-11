"""Tests for performance monitoring utilities (app/core/performance.py)."""
import asyncio
import pytest
from app.core.performance import PerformanceMonitor, timed, timed_query, monitor


class TestPerformanceMonitor:
    def test_initial_state(self):
        m = PerformanceMonitor()
        assert m.metrics["api_calls"] == {}
        assert m.metrics["db_queries"] == {}
        assert m.metrics["ai_pipeline"] == {}

    def test_log_api_call_creates_entry(self):
        m = PerformanceMonitor()
        m.log_api_call("/health", 50.0, 200)
        assert "/health" in m.metrics["api_calls"]
        assert m.metrics["api_calls"]["/health"]["count"] == 1
        assert m.metrics["api_calls"]["/health"]["avg_duration"] == 50.0

    def test_log_api_call_accumulates(self):
        m = PerformanceMonitor()
        m.log_api_call("/health", 40.0, 200)
        m.log_api_call("/health", 60.0, 200)
        entry = m.metrics["api_calls"]["/health"]
        assert entry["count"] == 2
        assert entry["total_duration"] == 100.0
        assert entry["avg_duration"] == 50.0

    def test_log_api_call_tracks_errors(self):
        m = PerformanceMonitor()
        m.log_api_call("/bad", 100.0, 500)
        assert m.metrics["api_calls"]["/bad"]["errors"] == 1

    def test_log_api_call_400_is_error(self):
        m = PerformanceMonitor()
        m.log_api_call("/bad", 100.0, 400)
        assert m.metrics["api_calls"]["/bad"]["errors"] == 1

    def test_log_api_call_success_no_error(self):
        m = PerformanceMonitor()
        m.log_api_call("/ok", 100.0, 200)
        assert m.metrics["api_calls"]["/ok"]["errors"] == 0

    def test_log_api_call_slow_request(self):
        """Verify logging doesn't crash on slow requests (>500ms)."""
        m = PerformanceMonitor()
        m.log_api_call("/slow", 600.0, 200)
        assert m.metrics["api_calls"]["/slow"]["count"] == 1

    def test_log_db_query_creates_entry(self):
        m = PerformanceMonitor()
        m.log_db_query("select_users", 10.0)
        assert "select_users" in m.metrics["db_queries"]
        assert m.metrics["db_queries"]["select_users"]["count"] == 1
        assert m.metrics["db_queries"]["select_users"]["avg_duration"] == 10.0

    def test_log_db_query_accumulates(self):
        m = PerformanceMonitor()
        m.log_db_query("select_users", 20.0)
        m.log_db_query("select_users", 30.0)
        entry = m.metrics["db_queries"]["select_users"]
        assert entry["count"] == 2
        assert entry["avg_duration"] == 25.0

    def test_log_db_query_slow_query(self):
        """Verify logging doesn't crash on slow queries (>100ms)."""
        m = PerformanceMonitor()
        m.log_db_query("slow_query", 200.0)
        assert m.metrics["db_queries"]["slow_query"]["count"] == 1

    def test_get_report_empty(self):
        m = PerformanceMonitor()
        report = m.get_report()
        assert "api_summary" in report
        assert "db_summary" in report
        assert report["api_summary"] == {}
        assert report["db_summary"] == {}

    def test_get_report_with_data(self):
        m = PerformanceMonitor()
        m.log_api_call("/test", 100.0, 200)
        m.log_api_call("/test", 50.0, 500)
        m.log_db_query("query1", 10.0)
        report = m.get_report()
        assert "/test" in report["api_summary"]
        assert report["api_summary"]["/test"]["count"] == 2
        assert report["api_summary"]["/test"]["error_rate"] == 50.0
        assert "query1" in report["db_summary"]

    def test_global_monitor_instance(self):
        """The global monitor singleton should work."""
        report = monitor.get_report()
        assert isinstance(report, dict)


class TestTimedDecorator:
    @pytest.mark.asyncio
    async def test_timed_async_function(self):
        @timed
        async def slow_func():
            await asyncio.sleep(0.01)
            return "done"

        result = await slow_func()
        assert result == "done"

    def test_timed_sync_function(self):
        @timed
        def sync_func():
            return 42

        result = sync_func()
        assert result == 42

    @pytest.mark.asyncio
    async def test_timed_async_preserves_exception(self):
        @timed
        async def error_func():
            raise ValueError("test error")

        with pytest.raises(ValueError, match="test error"):
            await error_func()

    def test_timed_sync_preserves_exception(self):
        @timed
        def error_func():
            raise RuntimeError("sync error")

        with pytest.raises(RuntimeError, match="sync error"):
            error_func()


class TestTimedQuery:
    @pytest.mark.asyncio
    async def test_timed_query_context_manager(self):
        async with timed_query("test_query"):
            await asyncio.sleep(0.01)
        # Should have logged the query to monitor
        # (using the global monitor instance)

    @pytest.mark.asyncio
    async def test_timed_query_logs_on_exception(self):
        with pytest.raises(ValueError):
            async with timed_query("error_query"):
                raise ValueError("test")

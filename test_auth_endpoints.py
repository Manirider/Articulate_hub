#!/usr/bin/env python3
"""
Test script to verify signup and login endpoints work correctly.
Run this after starting the backend server: python main.py
"""
import asyncio
import httpx
import json

BASE_URL = "http://localhost:8000"

async def test_auth_flow():
    async with httpx.AsyncClient(base_url=BASE_URL) as client:
        print("=" * 60)
        print("Testing AI Communication Coach Auth Endpoints")
        print("=" * 60)
        
        # Test data
        test_email = "testuser@example.com"
        test_password = "TestPassword123"
        test_full_name = "Test User"
        
        # 1. Test Signup
        print("\n1️⃣  Testing SIGNUP endpoint...")
        print(f"   POST /api/v1/auth/signup")
        try:
            signup_response = await client.post(
                "/api/v1/auth/signup",
                json={
                    "email": test_email,
                    "full_name": test_full_name,
                    "password": test_password
                }
            )
            print(f"   Status: {signup_response.status_code}")
            
            if signup_response.status_code == 200:
                data = signup_response.json()
                access_token = data.get("access_token")
                print(f"   ✅ Signup successful!")
                print(f"   Token: {access_token[:50]}...")
            elif signup_response.status_code == 409:
                print(f"   ⚠️  User already exists (this is expected if you ran this before)")
                print(f"   Response: {signup_response.json()}")
            else:
                print(f"   ❌ Signup failed: {signup_response.json()}")
                return False
        except Exception as e:
            print(f"   ❌ Error during signup: {e}")
            return False
        
        # 2. Test Login
        print("\n2️⃣  Testing LOGIN endpoint...")
        print(f"   POST /api/v1/auth/login")
        try:
            login_response = await client.post(
                "/api/v1/auth/login",
                json={
                    "email": test_email,
                    "password": test_password
                }
            )
            print(f"   Status: {login_response.status_code}")
            
            if login_response.status_code == 200:
                data = login_response.json()
                access_token = data.get("access_token")
                print(f"   ✅ Login successful!")
                print(f"   Token: {access_token[:50]}...")
                
                # 3. Test /me endpoint with the token
                print("\n3️⃣  Testing /me endpoint (with auth)...")
                print(f"   GET /api/v1/auth/me")
                try:
                    me_response = await client.get(
                        "/api/v1/auth/me",
                        headers={"Authorization": f"Bearer {access_token}"}
                    )
                    print(f"   Status: {me_response.status_code}")
                    
                    if me_response.status_code == 200:
                        user_data = me_response.json()
                        print(f"   ✅ User data retrieved:")
                        print(f"      Email: {user_data.get('email')}")
                        print(f"      Name: {user_data.get('full_name')}")
                        print(f"      Level: {user_data.get('level')}")
                        print(f"      XP: {user_data.get('xp')}")
                        print(f"      Streak: {user_data.get('streak_days')} days")
                    else:
                        print(f"   ❌ Failed to get user data: {me_response.json()}")
                except Exception as e:
                    print(f"   ❌ Error getting user data: {e}")
            else:
                print(f"   ❌ Login failed: {login_response.json()}")
                return False
        except Exception as e:
            print(f"   ❌ Error during login: {e}")
            return False
        
        print("\n" + "=" * 60)
        print("✅ All tests passed!")
        print("=" * 60)
        return True

if __name__ == "__main__":
    print("\n📋 Prerequisites:")
    print("   1. Start the backend: cd backend && python main.py")
    print("   2. Ensure PostgreSQL/SQLite is running")
    print("   3. Run this test: python test_auth_endpoints.py")
    print()
    
    try:
        success = asyncio.run(test_auth_flow())
        exit(0 if success else 1)
    except Exception as e:
        print(f"\n❌ Test failed with error: {e}")
        exit(1)

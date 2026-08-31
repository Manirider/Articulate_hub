/*
 * Critical User Flows E2E Tests
 * 
 * These tests cover the most important user journeys:
 * 1. Authentication (signup, login, logout)
 * 2. Complete practice session flow
 * 3. Viva/Q&A defense flow
 * 4. Dashboard and analytics
 * 
 * These tests verify end-to-end integration of frontend, backend, and AI services.
 */

import { test, expect } from '@playwright/test';

// Test data
const TEST_USER = {
  email: `test-${Date.now()}@example.com`,
  password: 'TestPassword123!',
  fullName: 'Test User'
};

const API_BASE = process.env.API_BASE_URL || 'http://localhost:8000';

let isBackendAvailable = false;

test.beforeAll(async ({ request }) => {
  try {
    const response = await request.get(`${API_BASE}/api/v1/health`, { timeout: 3000 });
    isBackendAvailable = response.ok();
  } catch {
    isBackendAvailable = false;
  }
});

test.describe('Authentication Flows', () => {
  test.beforeEach(async () => {
    test.skip(!isBackendAvailable, 'Backend API server is not available');
  });
  
  test('complete signup and login flow', async ({ page }) => {
    // Navigate to auth page
    await page.goto('/auth');
    
    // Verify auth page loads
    await expect(page.locator('text=Welcome Back')).toBeVisible();
    
    // Switch to signup
    await page.click('text=Sign Up');
    
    // Fill signup form
    await page.fill('input[name="fullName"]', TEST_USER.fullName);
    await page.fill('input[name="email"]', TEST_USER.email);
    await page.fill('input[name="password"]', TEST_USER.password);
    
    // Submit signup
    await page.click('button[type="submit"]:has-text("Sign Up")');
    
    // Verify redirect to dashboard
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator(`text=${TEST_USER.fullName}`)).toBeVisible();
    
    // Logout
    await page.click('[data-testid="logout-button"]');
    await expect(page).toHaveURL('/auth');
    
    // Login with credentials
    await page.fill('input[name="email"]', TEST_USER.email);
    await page.fill('input[name="password"]', TEST_USER.password);
    await page.click('button[type="submit"]:has-text("Sign In")');
    
    // Verify login successful
    await expect(page).toHaveURL('/dashboard');
  });

  test('login with invalid credentials shows error', async ({ page }) => {
    await page.goto('/auth');
    
    await page.fill('input[name="email"]', 'invalid@example.com');
    await page.fill('input[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]:has-text("Sign In")');
    
    // Verify error message
    await expect(page.locator('text=Invalid email or password')).toBeVisible();
  });

  test('password validation prevents weak passwords', async ({ page }) => {
    await page.goto('/auth');
    await page.click('text=Sign Up');
    
    await page.fill('input[name="email"]', `weak-${Date.now()}@example.com`);
    await page.fill('input[name="password"]', '123'); // Weak password
    
    await page.click('button[type="submit"]:has-text("Sign Up")');
    
    // Should show validation error
    await expect(page.locator('text=Password must be')).toBeVisible();
  });
});

test.describe('Practice Session Flows', () => {
  
  test.beforeEach(async ({ page }) => {
    test.skip(!isBackendAvailable, 'Backend API server is not available');
    // Login before each test
    await page.goto('/auth');
    await page.fill('input[name="email"]', TEST_USER.email);
    await page.fill('input[name="password"]', TEST_USER.password);
    await page.click('button[type="submit"]:has-text("Sign In")');
    await expect(page).toHaveURL('/dashboard');
  });

  test('complete presentation practice session', async ({ page }) => {
    // Navigate to presentation practice
    await page.goto('/practice/presentation');
    
    // Select topic
    await page.click('text=Technology');
    await page.fill('input[placeholder*="topic"]', 'AI in Healthcare');
    
    // Start practice
    await page.click('button:has-text("Start Practice")');
    
    // Verify practice page loads with camera
    await expect(page.locator('video')).toBeVisible();
    
    // Simulate recording (5 seconds)
    await page.click('button:has-text("Start Recording")');
    await page.waitForTimeout(1000);
    await page.click('button:has-text("Stop Recording")');
    
    // Wait for AI analysis
    await expect(page.locator('text=Analyzing')).toBeVisible();
    await expect(page.locator('text=Your Feedback')).toBeVisible({ timeout: 30000 });
    
    // Verify feedback scores are displayed
    await expect(page.locator('text=Clarity')).toBeVisible();
    await expect(page.locator('text=Confidence')).toBeVisible();
    await expect(page.locator('text=Content')).toBeVisible();
  });

  test('viva/q&a defense flow', async ({ page }) => {
    // First complete a session to have transcript
    await page.goto('/practice/presentation');
    await page.click('text=Technology');
    await page.fill('input[placeholder*="topic"]', 'Test Topic');
    await page.click('button:has-text("Start Practice")');
    
    // Quick recording
    await expect(page.locator('video')).toBeVisible();
    await page.click('button:has-text("Start Recording")');
    await page.waitForTimeout(2000);
    await page.click('button:has-text("Stop Recording")');
    
    // Wait for feedback
    await expect(page.locator('text=Your Feedback')).toBeVisible({ timeout: 30000 });
    
    // Navigate to Viva
    await page.goto('/practice/viva');
    
    // If AI not configured, should show appropriate message
    const errorVisible = await page.locator('text=AI service is not configured').isVisible().catch(() => false);
    const questionsVisible = await page.locator('text=AI Examiner').isVisible().catch(() => false);
    
    expect(errorVisible || questionsVisible).toBeTruthy();
  });

  test('dashboard analytics display', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Verify key elements
    await expect(page.locator('text=Overall Score')).toBeVisible();
    await expect(page.locator('text=Sessions Completed')).toBeVisible();
    
    // Check that chart is rendered
    await expect(page.locator('canvas, .recharts-wrapper')).toBeVisible();
  });
});

test.describe('Navigation & UI', () => {
  
  test.beforeEach(async ({ page }) => {
    test.skip(!isBackendAvailable, 'Backend API server is not available');
    await page.goto('/auth');
    await page.fill('input[name="email"]', TEST_USER.email);
    await page.fill('input[name="password"]', TEST_USER.password);
    await page.click('button[type="submit"]:has-text("Sign In")');
    await expect(page).toHaveURL('/dashboard');
  });

  test('navbar navigation works', async ({ page }) => {
    // Click practice dropdown
    await page.click('text=Practice');
    
    // Navigate to Group Discussion
    await page.click('text=Group Discussion');
    await expect(page).toHaveURL('/practice/gd');
    
    // Navigate to Debate
    await page.click('text=Practice');
    await page.click('text=Debate');
    await expect(page).toHaveURL('/practice/debate');
    
    // Navigate to Dashboard
    await page.click('text=Dashboard');
    await expect(page).toHaveURL('/dashboard');
  });

  test('protected routes redirect unauthenticated users', async ({ page, context }) => {
    // Clear storage to simulate logged out
    await context.clearCookies();
    await page.evaluate(() => localStorage.clear());
    
    // Try to access dashboard
    await page.goto('/dashboard');
    
    // Should redirect to auth
    await expect(page).toHaveURL('/auth');
  });

  test('responsive design - mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/dashboard');
    
    // Verify mobile menu button is visible
    await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible();
    
    // Verify content is accessible
    await expect(page.locator('text=Overall Score')).toBeVisible();
  });
});

test.describe('API Health Checks', () => {
  test.beforeEach(async () => {
    test.skip(!isBackendAvailable, 'Backend API server is not available');
  });
  
  test('backend health endpoint returns ok', async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/v1/health`);
    
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.status).toBe('healthy');
  });

  test('AI health endpoint returns proper status', async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/v1/health/ai`);
    
    // Should return either 200 (healthy) or 503 (not configured)
    expect([200, 503]).toContain(response.status());
    
    const body = await response.json();
    expect(body).toHaveProperty('overall_status');
    expect(body).toHaveProperty('is_ai_available');
  });

  test('protected API requires authentication', async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/v1/sessions`);
    
    expect(response.status()).toBe(401);
  });
});

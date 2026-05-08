/**
 * Performance Monitoring Service
 * Tracks Core Web Vitals and custom metrics
 */

interface PerformanceMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  timestamp: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private observers: PerformanceObserver[] = [];

  init() {
    if (typeof window === 'undefined') return;

    // Core Web Vitals
    this.observeLCP();
    this.observeFID();
    this.observeCLS();
    this.observeFCP();
    this.observeTTFB();

    // Custom metrics
    this.measureTimeToInteractive();
    this.measureBundleSize();

    console.log('[Performance] Monitoring initialized');
  }

  private observeLCP() {
    if (!('PerformanceObserver' in window)) return;

    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        
        const metric: PerformanceMetric = {
          name: 'LCP',
          value: lastEntry.startTime,
          rating: this.getLCPRating(lastEntry.startTime),
          timestamp: Date.now(),
        };
        
        this.record(metric);
      });

      observer.observe({ entryTypes: ['largest-contentful-paint'] });
      this.observers.push(observer);
    } catch (e) {
      console.warn('[Performance] LCP observation failed:', e);
    }
  }

  private observeFID() {
    if (!('PerformanceObserver' in window)) return;

    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const fidEntry = entry as PerformanceEventTiming;
          
          const metric: PerformanceMetric = {
            name: 'FID',
            value: fidEntry.processingStart - fidEntry.startTime,
            rating: this.getFIDRating(fidEntry.processingStart - fidEntry.startTime),
            timestamp: Date.now(),
          };
          
          this.record(metric);
        }
      });

      observer.observe({ entryTypes: ['first-input'] });
      this.observers.push(observer);
    } catch (e) {
      console.warn('[Performance] FID observation failed:', e);
    }
  }

  private observeCLS() {
    if (!('PerformanceObserver' in window)) return;

    let clsValue = 0;
    
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!(entry as any).hadRecentInput) {
            clsValue += (entry as any).value;
          }
        }
        
        const metric: PerformanceMetric = {
          name: 'CLS',
          value: clsValue,
          rating: this.getCLSRating(clsValue),
          timestamp: Date.now(),
        };
        
        this.record(metric);
      });

      observer.observe({ entryTypes: ['layout-shift'] });
      this.observers.push(observer);
    } catch (e) {
      console.warn('[Performance] CLS observation failed:', e);
    }
  }

  private observeFCP() {
    if (!('PerformanceObserver' in window)) return;

    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.name === 'first-contentful-paint') {
            const metric: PerformanceMetric = {
              name: 'FCP',
              value: entry.startTime,
              rating: this.getFCPRating(entry.startTime),
              timestamp: Date.now(),
            };
            
            this.record(metric);
          }
        }
      });

      observer.observe({ entryTypes: ['paint'] });
      this.observers.push(observer);
    } catch (e) {
      console.warn('[Performance] FCP observation failed:', e);
    }
  }

  private observeTTFB() {
    if (typeof window === 'undefined') return;

    window.addEventListener('load', () => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      
      if (navigation) {
        const ttfb = navigation.responseStart - navigation.startTime;
        
        const metric: PerformanceMetric = {
          name: 'TTFB',
          value: ttfb,
          rating: this.getTTFBRating(ttfb),
          timestamp: Date.now(),
        };
        
        this.record(metric);
      }
    });
  }

  private measureTimeToInteractive() {
    if (typeof window === 'undefined') return;

    window.addEventListener('load', () => {
      setTimeout(() => {
        const timing = performance.timing;
        const tti = timing.domInteractive - timing.navigationStart;
        
        const metric: PerformanceMetric = {
          name: 'TTI',
          value: tti,
          rating: tti < 3800 ? 'good' : tti < 7300 ? 'needs-improvement' : 'poor',
          timestamp: Date.now(),
        };
        
        this.record(metric);
        this.logMetrics();
      }, 0);
    });
  }

  private measureBundleSize() {
    if (typeof window === 'undefined') return;

    window.addEventListener('load', () => {
      const resources = performance.getEntriesByType('resource');
      let totalSize = 0;
      let jsSize = 0;
      let cssSize = 0;

      resources.forEach((resource: PerformanceResourceTiming) => {
        const size = resource.transferSize || 0;
        totalSize += size;
        
        if (resource.name.endsWith('.js')) jsSize += size;
        if (resource.name.endsWith('.css')) cssSize += size;
      });

      console.log('[Performance] Bundle sizes:', {
        total: `${(totalSize / 1024).toFixed(2)} KB`,
        javascript: `${(jsSize / 1024).toFixed(2)} KB`,
        css: `${(cssSize / 1024).toFixed(2)} KB`,
      });
    });
  }

  private getLCPRating(value: number): PerformanceMetric['rating'] {
    if (value <= 2500) return 'good';
    if (value <= 4000) return 'needs-improvement';
    return 'poor';
  }

  private getFIDRating(value: number): PerformanceMetric['rating'] {
    if (value <= 100) return 'good';
    if (value <= 300) return 'needs-improvement';
    return 'poor';
  }

  private getCLSRating(value: number): PerformanceMetric['rating'] {
    if (value <= 0.1) return 'good';
    if (value <= 0.25) return 'needs-improvement';
    return 'poor';
  }

  private getFCPRating(value: number): PerformanceMetric['rating'] {
    if (value <= 1800) return 'good';
    if (value <= 3000) return 'needs-improvement';
    return 'poor';
  }

  private getTTFBRating(value: number): PerformanceMetric['rating'] {
    if (value <= 800) return 'good';
    if (value <= 1800) return 'needs-improvement';
    return 'poor';
  }

  private record(metric: PerformanceMetric) {
    this.metrics.push(metric);
    
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      const emoji = metric.rating === 'good' ? '✅' : metric.rating === 'needs-improvement' ? '⚠️' : '❌';
      console.log(`[Performance] ${emoji} ${metric.name}: ${metric.value.toFixed(2)}ms (${metric.rating})`);
    }

    // Send to analytics in production
    if (process.env.NODE_ENV === 'production') {
      this.sendToAnalytics(metric);
    }
  }

  private sendToAnalytics(metric: PerformanceMetric) {
    // Example: Send to Google Analytics, Sentry, or custom endpoint
    // window.gtag?.('event', 'web_vitals', { ... });
  }

  private logMetrics() {
    const summary = this.metrics.reduce((acc, m) => {
      acc[m.name] = m;
      return acc;
    }, {} as Record<string, PerformanceMetric>);

    console.log('[Performance] Summary:', summary);
  }

  getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  destroy() {
    this.observers.forEach((obs) => obs.disconnect());
    this.observers = [];
  }
}

export const performanceMonitor = new PerformanceMonitor();

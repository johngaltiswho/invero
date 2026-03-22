// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'

// Mock environment variables for tests
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'
process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = 'test-clerk-key'
process.env.CLERK_SECRET_KEY = 'test-clerk-secret'

// Mock fetch globally for API tests
global.fetch = jest.fn()

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  })),
  useSearchParams: jest.fn(() => new URLSearchParams()),
  usePathname: jest.fn(() => '/'),
}))

// Mock Clerk
jest.mock('@clerk/nextjs', () => ({
  useUser: jest.fn(() => ({
    user: { id: 'test-user-id', emailAddresses: [{ emailAddress: 'test@example.com' }] },
    isLoaded: true,
  })),
  useAuth: jest.fn(() => ({
    userId: 'test-user-id',
    isLoaded: true,
    isSignedIn: true,
  })),
  ClerkProvider: ({ children }) => children,
}))

// Mock Next.js server components
class MockNextResponse {
  constructor(body, init) {
    this.body = body
    this.status = init?.status || 200
    this.headers = new Map(Object.entries(init?.headers || {}))
  }

  static json(data, init) {
    return new MockNextResponse(JSON.stringify(data), {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers || {}),
      },
    })
  }

  async json() {
    return JSON.parse(this.body)
  }
}

MockNextResponse.prototype.headers = {
  get: function(key) {
    return this.headers?.get?.(key) || null
  },
  set: function(key, value) {
    this.headers?.set?.(key, value)
  },
}

global.Headers = class Headers {
  constructor(init) {
    this.map = new Map()
    if (init) {
      if (init instanceof Headers) {
        init.forEach((value, key) => this.map.set(key, value))
      } else if (typeof init === 'object') {
        Object.entries(init).forEach(([key, value]) => this.map.set(key, value))
      }
    }
  }

  get(key) {
    return this.map.get(key) || null
  }

  set(key, value) {
    this.map.set(key, value)
  }

  has(key) {
    return this.map.has(key)
  }

  delete(key) {
    this.map.delete(key)
  }

  forEach(callback) {
    this.map.forEach((value, key) => callback(value, key))
  }
}

global.NextResponse = MockNextResponse

// Mock Request for Next.js server
global.Request = class Request {
  constructor(input, init) {
    this.url = typeof input === 'string' ? input : input.url
    this.method = init?.method || 'GET'
    this.headers = new global.Headers(init?.headers)
    this.body = init?.body
  }
}

global.Response = class Response {
  constructor(body, init) {
    this.body = body
    this.status = init?.status || 200
    this.statusText = init?.statusText || ''
    this.headers = new global.Headers(init?.headers)
  }

  static json(data, init) {
    return new Response(JSON.stringify(data), {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers || {}),
      },
    })
  }

  async json() {
    return JSON.parse(this.body)
  }

  async text() {
    return this.body
  }
}

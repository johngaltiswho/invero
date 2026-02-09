/**
 * Test utilities and helpers
 */

// Mock Supabase client
export const createMockSupabaseClient = () => ({
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  single: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  data: null,
  error: null,
})

// Mock Request object
export const createMockRequest = (options: {
  method?: string
  url?: string
  body?: any
  headers?: Record<string, string>
} = {}): Request => {
  const {
    method = 'GET',
    url = 'http://localhost:3000/api/test',
    body = null,
    headers = {},
  } = options

  return {
    method,
    url,
    headers: new Headers(headers),
    json: jest.fn().mockResolvedValue(body),
    text: jest.fn().mockResolvedValue(JSON.stringify(body)),
  } as any
}

// Mock Response assertions
export const expectSuccessResponse = async (response: Response, expectedData?: any) => {
  expect(response.status).toBe(200)
  if (expectedData) {
    const data = await response.json()
    expect(data).toEqual(expectedData)
  }
}

export const expectErrorResponse = async (
  response: Response,
  expectedStatus: number,
  expectedMessage?: string
) => {
  expect(response.status).toBe(expectedStatus)
  if (expectedMessage) {
    const data = await response.json()
    expect(data.error).toContain(expectedMessage)
  }
}

// Sample test data
export const mockContractor = {
  id: 'contractor-123',
  clerk_user_id: 'test-user-id',
  company_name: 'Test Construction Co',
  email: 'test@example.com',
  status: 'approved',
  created_at: new Date().toISOString(),
}

export const mockProject = {
  id: 'project-123',
  contractor_id: 'contractor-123',
  name: 'Test Infrastructure Project',
  client: 'ABB',
  value: 10000000,
  status: 'awarded',
  created_at: new Date().toISOString(),
}

export const mockBOQItem = {
  id: 'boq-item-123',
  description: 'Concrete M25',
  unit: 'm³',
  quantity: 100,
  rate: 5000,
  amount: 500000,
}

export const mockMaterial = {
  id: 'material-123',
  name: 'Cement',
  category: 'Construction',
  unit: 'bags',
  current_price: 350,
  status: 'approved',
}

export const mockPurchaseRequest = {
  id: 'pr-123',
  project_id: 'project-123',
  contractor_id: 'contractor-123',
  vendor_name: 'Test Vendor',
  status: 'pending',
  total_amount: 100000,
  created_at: new Date().toISOString(),
}

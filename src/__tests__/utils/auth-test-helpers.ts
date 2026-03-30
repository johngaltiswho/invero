export function createMockClerkUser(overrides: Partial<any> = {}) {
  return {
    id: 'user_123',
    emailAddresses: [{ emailAddress: 'investor@example.com' }],
    firstName: 'Test',
    lastName: 'Investor',
    publicMetadata: {},
    privateMetadata: {},
    ...overrides,
  };
}

export function createMaybeSingleChain(response: { data: any; error: any }) {
  const maybeSingle = jest.fn().mockResolvedValue(response);
  const eqStatus = jest.fn().mockReturnValue({ maybeSingle });
  const eqPrimary = jest.fn().mockReturnValue({ eq: eqStatus, maybeSingle });
  const select = jest.fn().mockReturnValue({ eq: eqPrimary });

  return {
    select,
    eqPrimary,
    eqStatus,
    maybeSingle,
  };
}

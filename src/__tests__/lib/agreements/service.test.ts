import {
  createInvestorAgreement,
  regenerateAgreementDraft,
  issueAgreement,
  signInvestorAgreement,
  markAgreementExecuted,
  voidAgreement,
  sendAgreementEmail,
  getInvestorById,
  getInvestorAgreement,
  listInvestorAgreements,
} from '@/lib/agreements/service';

// Mock dependencies
jest.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: jest.fn(),
    storage: {
      listBuckets: jest.fn().mockResolvedValue({
        data: [{ name: 'investor-documents' }],
        error: null,
      }),
      createBucket: jest.fn().mockResolvedValue({ error: null }),
      from: jest.fn(() => ({
        upload: jest.fn().mockResolvedValue({ error: null }),
        createSignedUrl: jest.fn().mockResolvedValue({
          data: { signedUrl: 'https://storage.example.com/signed-url' },
          error: null,
        }),
      })),
    },
  },
}));

jest.mock('@/lib/email', () => ({
  sendEmail: jest.fn().mockResolvedValue({}),
}));

jest.mock('@/lib/agreements/pdf', () => ({
  generateInvestorAgreementPDF: jest.fn(() => Buffer.from('PDF_CONTENT')),
}));

jest.mock('@/lib/agreements/renderer', () => ({
  buildInvestorAgreementPayload: jest.fn((data) => data),
  renderAgreementHTML: jest.fn(() => ({
    html: '<html>Agreement</html>',
    templateKey: 'investor-participation-v1',
    templateVersion: '1.0.0',
  })),
}));

jest.mock('@clerk/nextjs/server', () => ({
  currentUser: jest.fn(),
}));

jest.mock('crypto', () => ({
  randomBytes: jest.fn(() => ({
    toString: () => 'random-token-123456',
  })),
}));

import { supabaseAdmin } from '@/lib/supabase';
import { sendEmail } from '@/lib/email';
import { currentUser } from '@clerk/nextjs/server';

describe('Agreement Service', () => {
  const mockActor = {
    id: 'admin-123',
    email: 'admin@finverno.com',
    name: 'Admin User',
  };

  const mockInvestor = {
    id: 'investor-123',
    email: 'investor@example.com',
    name: 'Test Investor',
    investor_type: 'individual',
    phone: '9876543210',
    pan_number: 'ABCDE1234F',
    address: '123 Test Street, Bangalore',
    agreement_status: null,
    activation_status: null,
  };

  const mockAgreement = {
    id: 'agreement-123',
    investor_id: 'investor-123',
    status: 'draft',
    commitment_amount: 1000000,
    agreement_date: '2024-01-15',
    investor_pan: 'ABCDE1234F',
    investor_address: '123 Test Street, Bangalore',
    company_signatory_name: 'John Doe',
    company_signatory_title: 'Director',
    notes: null,
    created_by: 'admin-123',
    updated_by: 'admin-123',
    created_at: '2024-01-10T10:00:00Z',
    updated_at: '2024-01-10T10:00:00Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getInvestorById', () => {
    it('should return investor when found', async () => {
      (supabaseAdmin.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: mockInvestor,
              error: null,
            }),
          }),
        }),
      });

      const result = await getInvestorById('investor-123');

      expect(result).toEqual(mockInvestor);
    });

    it('should return null when investor not found', async () => {
      (supabaseAdmin.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      });

      const result = await getInvestorById('nonexistent');

      expect(result).toBeNull();
    });

    it('should throw error on database failure', async () => {
      (supabaseAdmin.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database error' },
            }),
          }),
        }),
      });

      await expect(getInvestorById('investor-123')).rejects.toThrow('Database error');
    });
  });

  describe('listInvestorAgreements', () => {
    it('should return all agreements when no investorId provided', async () => {
      const mockAgreements = [mockAgreement];

      (supabaseAdmin.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({
            data: mockAgreements,
            error: null,
          }),
        }),
      });

      const result = await listInvestorAgreements();

      expect(result).toEqual(mockAgreements);
    });

    it('should filter by investorId when provided', async () => {
      const mockAgreements = [mockAgreement];

      const mockQuery = {
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: mockAgreements,
              error: null,
            }),
          }),
        }),
      };

      (supabaseAdmin.from as jest.Mock).mockReturnValue(mockQuery);

      const result = await listInvestorAgreements('investor-123');

      expect(result).toEqual(mockAgreements);
    });
  });

  describe('createInvestorAgreement', () => {
    it('should create agreement in draft status', async () => {
      (supabaseAdmin.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'investors') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({
                  data: mockInvestor,
                  error: null,
                }),
              }),
            }),
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: null,
                error: null,
              }),
            }),
          };
        }
        return {
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: mockAgreement,
                error: null,
              }),
            }),
          }),
        };
      });

      const result = await createInvestorAgreement({
        investorId: 'investor-123',
        commitmentAmount: 1000000,
        agreementDate: '2024-01-15',
        companySignatoryName: 'John Doe',
        companySignatoryTitle: 'Director',
        actor: mockActor,
      });

      expect(result).toEqual(mockAgreement);
      expect(result.status).toBe('draft');
    });

    it('should throw error if investor not found', async () => {
      (supabaseAdmin.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      });

      await expect(
        createInvestorAgreement({
          investorId: 'nonexistent',
          commitmentAmount: 1000000,
          agreementDate: '2024-01-15',
          companySignatoryName: 'John Doe',
          companySignatoryTitle: 'Director',
          actor: mockActor,
        })
      ).rejects.toThrow('Investor not found');
    });
  });

  describe('State Transitions', () => {
    describe('regenerateAgreementDraft', () => {
      it('should regenerate draft and transition to generated status', async () => {
        const generatedAgreement = { ...mockAgreement, status: 'generated' };

        (supabaseAdmin.from as jest.Mock).mockImplementation((table: string) => {
          if (table === 'investor_agreements') {
            // First call: getInvestorAgreement
            const selectMock = jest.fn().mockReturnValueOnce({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({
                  data: mockAgreement,
                  error: null,
                }),
              }),
            });

            return {
              select: selectMock,
              update: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  select: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({
                      data: generatedAgreement,
                      error: null,
                    }),
                  }),
                }),
              }),
            };
          }
          // investors table
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({
                  data: mockInvestor,
                  error: null,
                }),
              }),
            }),
          };
        });

        const result = await regenerateAgreementDraft('agreement-123', mockActor);

        expect(result.status).toBe('generated');
      });

      it('should reject regeneration of non-draft/generated agreements', async () => {
        const executedAgreement = { ...mockAgreement, status: 'executed' };

        (supabaseAdmin.from as jest.Mock).mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValue({
                data: executedAgreement,
                error: null,
              }),
            }),
          }),
        });

        await expect(
          regenerateAgreementDraft('agreement-123', mockActor)
        ).rejects.toThrow('Only unsigned draft, generated, or issued agreements can be regenerated');
      });
    });

    describe('issueAgreement', () => {
      it('should transition generated agreement to issued', async () => {
        const generatedAgreement = { ...mockAgreement, status: 'generated' };
        const issuedAgreement = { ...generatedAgreement, status: 'issued' };

        (supabaseAdmin.from as jest.Mock).mockImplementation(() => ({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValue({
                data: generatedAgreement,
                error: null,
              }),
            }),
          }),
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: issuedAgreement,
                  error: null,
                }),
              }),
            }),
          }),
        }));

        const result = await issueAgreement('agreement-123', mockActor);

        expect(result.status).toBe('issued');
      });

      it('should reject issuing draft agreement', async () => {
        (supabaseAdmin.from as jest.Mock).mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValue({
                data: mockAgreement, // draft status
                error: null,
              }),
            }),
          }),
        });

        await expect(issueAgreement('agreement-123', mockActor)).rejects.toThrow(
          'Agreement must be generated before issue'
        );
      });
    });

    describe('signInvestorAgreement', () => {
      it('should sign issued agreement and transition to investor_signed', async () => {
        const issuedAgreement = { ...mockAgreement, status: 'issued' };
        const signedAgreement = { ...issuedAgreement, status: 'investor_signed' };

        (currentUser as jest.Mock).mockResolvedValue({
          id: 'user-123',
          emailAddresses: [{ emailAddress: mockInvestor.email }],
        });

        (supabaseAdmin.from as jest.Mock).mockImplementation((table: string) => {
          if (table === 'investor_agreements') {
            return {
              select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                      maybeSingle: jest.fn().mockResolvedValue({
                        data: issuedAgreement,
                        error: null,
                  }),
                }),
              }),
              update: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  select: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({
                      data: signedAgreement,
                      error: null,
                    }),
                  }),
                }),
              }),
            };
          }
          // investors table
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({
                  data: mockInvestor,
                  error: null,
                }),
              }),
            }),
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: null,
                error: null,
              }),
            }),
          };
        });

        const result = await signInvestorAgreement({
          agreementId: 'agreement-123',
          typedName: 'Test Investor',
          acceptance: {
            own_funds: true,
            private_investment: true,
            risk_disclosure: true,
          },
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
        });

        expect(result.status).toBe('investor_signed');
        expect(sendEmail).not.toHaveBeenCalled();
      });

      it('should require all acceptance checkboxes', async () => {
        (currentUser as jest.Mock).mockResolvedValue({
          id: 'user-123',
          emailAddresses: [{ emailAddress: mockInvestor.email }],
        });

        await expect(
          signInvestorAgreement({
            agreementId: 'agreement-123',
            typedName: 'Test Investor',
            acceptance: {
              own_funds: true,
              private_investment: false, // Missing required acceptance
              risk_disclosure: true,
            },
          })
        ).rejects.toThrow('All investor confirmations are required');
      });

      it('should require non-empty typed name', async () => {
        (currentUser as jest.Mock).mockResolvedValue({
          id: 'user-123',
          emailAddresses: [{ emailAddress: mockInvestor.email }],
        });

        await expect(
          signInvestorAgreement({
            agreementId: 'agreement-123',
            typedName: '   ', // Empty after trim
            acceptance: {
              own_funds: true,
              private_investment: true,
              risk_disclosure: true,
            },
          })
        ).rejects.toThrow('Typed signature name is required');
      });

      it('should reject signing if agreement not in issued status', async () => {
        (currentUser as jest.Mock).mockResolvedValue({
          id: 'user-123',
          emailAddresses: [{ emailAddress: mockInvestor.email }],
        });

        (supabaseAdmin.from as jest.Mock).mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValue({
                data: { ...mockAgreement, status: 'draft' },
                error: null,
              }),
            }),
          }),
        });

        await expect(
          signInvestorAgreement({
            agreementId: 'agreement-123',
            typedName: 'Test Investor',
            acceptance: {
              own_funds: true,
              private_investment: true,
              risk_disclosure: true,
            },
          })
        ).rejects.toThrow('Agreement is not available for signing');
      });

      it('should reject signing by wrong investor', async () => {
        const issuedAgreement = { ...mockAgreement, status: 'issued' };

        (currentUser as jest.Mock).mockResolvedValue({
          id: 'user-456',
          emailAddresses: [{ emailAddress: 'wrong@example.com' }],
        });

        (supabaseAdmin.from as jest.Mock).mockImplementation((table: string) => {
          if (table === 'investor_agreements') {
            return {
              select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  maybeSingle: jest.fn().mockResolvedValue({
                    data: issuedAgreement,
                    error: null,
                  }),
                }),
              }),
            };
          }
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({
                  data: mockInvestor,
                  error: null,
                }),
              }),
            }),
          };
        });

        await expect(
          signInvestorAgreement({
            agreementId: 'agreement-123',
            typedName: 'Test Investor',
            acceptance: {
              own_funds: true,
              private_investment: true,
              risk_disclosure: true,
            },
          })
        ).rejects.toThrow('Agreement does not belong to the current investor');
      });
    });

    describe('voidAgreement', () => {
      it('should void non-executed agreement', async () => {
        const voidedAgreement = { ...mockAgreement, status: 'voided' };

        (supabaseAdmin.from as jest.Mock).mockImplementation((table: string) => {
          if (table === 'investor_agreements') {
            return {
              select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  maybeSingle: jest.fn().mockResolvedValue({
                    data: mockAgreement,
                    error: null,
                  }),
                }),
              }),
              update: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  select: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({
                      data: voidedAgreement,
                      error: null,
                    }),
                  }),
                }),
              }),
            };
          }
          return {
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: null,
                error: null,
              }),
            }),
          };
        });

        const result = await voidAgreement('agreement-123', mockActor, 'Invalid commitment');

        expect(result.status).toBe('voided');
      });

      it('should reject voiding executed agreement', async () => {
        const executedAgreement = { ...mockAgreement, status: 'executed' };

        (supabaseAdmin.from as jest.Mock).mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValue({
                data: executedAgreement,
                error: null,
              }),
            }),
          }),
        });

        await expect(
          voidAgreement('agreement-123', mockActor, 'Test')
        ).rejects.toThrow('Executed agreements cannot be voided');
      });
    });
  });

  describe('Email Notifications', () => {
    it('should send agreement ready email', async () => {
      const generatedAgreement = {
        ...mockAgreement,
        status: 'generated',
        draft_pdf_path: 'path/to/draft.pdf',
      };

      (supabaseAdmin.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'investor_agreements') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({
                  data: generatedAgreement,
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'agreement_delivery_logs') {
          return {
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: {
                    id: 'log-123',
                    investor_agreement_id: 'agreement-123',
                    delivery_channel: 'email',
                    delivery_status: 'sent',
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValue({
                data: mockInvestor,
                error: null,
              }),
            }),
          }),
        };
      });

      await sendAgreementEmail('agreement-123', mockActor);

      expect(sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: mockInvestor.email,
        })
      );
    });

    it('should throw error if draft PDF missing', async () => {
      const agreementWithoutPdf = { ...mockAgreement, draft_pdf_path: null };

      (supabaseAdmin.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: agreementWithoutPdf,
              error: null,
            }),
          }),
        }),
      });

      await expect(sendAgreementEmail('agreement-123', mockActor)).rejects.toThrow(
        'Agreement draft PDF missing'
      );
    });
  });
});

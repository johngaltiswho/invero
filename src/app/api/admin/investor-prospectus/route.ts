import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase';
import { generateInvestorProspectusPDF } from '@/lib/investor-prospectus/pdf';

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const investorId = String(searchParams.get('investor_id') || '').trim();

    if (!investorId) {
      return NextResponse.json({ error: 'investor_id is required' }, { status: 400 });
    }

    const [{ data: investor, error: investorError }, { data: interest, error: interestError }] = await Promise.all([
      supabaseAdmin
        .from('investors')
        .select('id, name, email, investor_type, phone, notes')
        .eq('id', investorId)
        .single(),
      supabaseAdmin
        .from('investor_interest_submissions')
        .select('preferred_model, proposed_amount, indicative_pool_amount, indicative_fixed_debt_amount, liquidity_preference, notes, created_at')
        .eq('investor_id', investorId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    if (investorError) {
      throw new Error(investorError.message || 'Failed to load investor');
    }

    if (interestError) {
      throw new Error(interestError.message || 'Failed to load investor interest');
    }

    if (!investor) {
      return NextResponse.json({ error: 'Investor not found' }, { status: 404 });
    }

    const generatedAtLabel = new Intl.DateTimeFormat('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'Asia/Kolkata',
    }).format(new Date());

    const pdfBuffer = generateInvestorProspectusPDF({
      investorName: investor.name,
      investorEmail: investor.email,
      investorType: investor.investor_type,
      investorPhone: investor.phone,
      proposedAmount: interest?.proposed_amount ?? null,
      preferredModel: interest?.preferred_model ?? null,
      indicativePoolAmount: interest?.indicative_pool_amount ?? null,
      indicativeFixedDebtAmount: interest?.indicative_fixed_debt_amount ?? null,
      liquidityPreference: interest?.liquidity_preference ?? null,
      notes: interest?.notes || investor.notes || null,
      generatedAtLabel,
    });

    const safeName = investor.name.replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'investor';

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${safeName}_Finverno_Prospectus.pdf"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('Error generating investor prospectus:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate investor prospectus' },
      { status: 500 }
    );
  }
}

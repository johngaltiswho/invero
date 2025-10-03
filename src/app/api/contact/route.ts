import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// POST - Submit contact form
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const {
      firstName,
      lastName,
      email,
      company,
      subject,
      message,
      consent
    } = body;

    // Validate required fields
    if (!firstName || !lastName || !email || !subject || !message) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields'
      }, { status: 400 });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid email format'
      }, { status: 400 });
    }

    // Validate consent
    if (!consent) {
      return NextResponse.json({
        success: false,
        error: 'Consent is required to submit the contact form'
      }, { status: 400 });
    }

    // Validate subject
    const validSubjects = [
      'general',
      'investor',
      'contractor',
      'technical',
      'partnership',
      'press',
      'other'
    ];
    
    if (!validSubjects.includes(subject)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid subject selected'
      }, { status: 400 });
    }

    // Insert contact form submission
    const { data: contact, error } = await supabase
      .from('contacts')
      .insert({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim().toLowerCase(),
        company: company?.trim() || null,
        subject,
        message: message.trim(),
        consent: true,
        status: 'new'
      })
      .select()
      .single();

    if (error) {
      console.error('Contact form submission error:', error);
      return NextResponse.json({
        success: false,
        error: 'Failed to submit contact form'
      }, { status: 500 });
    }

    // Optionally, you could add email notification logic here
    // For example, send an email to your team about the new contact
    
    return NextResponse.json({
      success: true,
      data: {
        id: contact.id,
        message: 'Thank you for contacting us! We will get back to you within 24 hours.'
      }
    });

  } catch (error) {
    console.error('Contact form API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}

// GET - Admin endpoint to fetch contact submissions (with authentication)
export async function GET(request: NextRequest) {
  try {
    // This would require admin authentication in a real app
    // For now, we'll just return the recent contacts
    
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = supabase
      .from('contacts')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data: contacts, error } = await query;

    if (error) {
      console.error('Error fetching contacts:', error);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch contacts'
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: { contacts: contacts || [] }
    });

  } catch (error) {
    console.error('Contact fetch API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}
import type { Metadata } from 'next';
import InvestLanding from '@/components/invest/InvestLanding';

export const metadata: Metadata = {
  title: 'Finverno | Private Investor Access',
  description:
    'Private investor information page for Finverno. Review participation options, liquidity framing, and request the current investor note.',
};

export default function InvestPage(): React.ReactElement {
  return <InvestLanding />;
}

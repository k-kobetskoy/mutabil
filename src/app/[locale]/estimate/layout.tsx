import { SiteHeader } from '@/features/shell/SiteHeader';

export default function EstimateLayout({ children }: LayoutProps<'/[locale]/estimate'>) {
  return (
    <div className="min-h-dvh bg-cloud">
      <SiteHeader compact />
      {children}
    </div>
  );
}

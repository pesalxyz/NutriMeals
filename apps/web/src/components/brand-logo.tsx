type BrandLogoVariant = 'icon' | 'header' | 'full';

export function BrandLogo({ variant = 'header', className = '' }: { variant?: BrandLogoVariant; className?: string }) {
  if (variant === 'icon') {
    return (
      <img
        src="/branding/icons/nutrimeals-icon-192.png"
        alt="NutriMeals icon"
        className={`brand-icon ${className}`.trim()}
      />
    );
  }

  if (variant === 'full') {
    return (
      <img
        src="/branding/nutrimeals-full.png"
        alt="NutriMeals - Scan. Eat. Know."
        className={`brand-full ${className}`.trim()}
      />
    );
  }

  return (
    <div className="brand-header">
      <img
        src="/branding/icons/nutrimeals-icon-64.png"
        alt="NutriMeals"
        className="brand-header__icon"
      />
      <div>
        <p className="brand-header__name">NutriMeals</p>
        <p className="small brand-header__tagline">Scan. Eat. Know.</p>
      </div>
    </div>
  );
}

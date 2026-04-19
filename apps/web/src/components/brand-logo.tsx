type BrandLogoVariant = 'icon' | 'header' | 'full';

export function BrandLogo({ variant = 'header', className = '' }: { variant?: BrandLogoVariant; className?: string }) {
  const sharedLogoSrc = '/branding/logo_png_nutrimeals.png';

  if (variant === 'icon') {
    return (
      <img
        src={sharedLogoSrc}
        alt="NutriMeals icon"
        className={`brand-icon ${className}`.trim()}
      />
    );
  }

  if (variant === 'full') {
    return (
      <img
        src={sharedLogoSrc}
        alt="NutriMeals - Scan. Eat. Know."
        className={`brand-full ${className}`.trim()}
      />
    );
  }

  return (
    <img
      src={sharedLogoSrc}
      alt="NutriMeals - Scan. Eat. Know."
      className={`brand-header__logo ${className}`.trim()}
    />
  );
}

import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import {
  OrganizationProfilePreview,
} from './OrganizationProfileRoute'
import {
  exampleSmeProfileImages,
  isSupportedOrganizationProfileImage,
} from './organizationProfile.model'

describe('OrganizationProfileRoute helpers', () => {
  it('renders the current organization profile preview with logo and banner images', () => {
    const html = renderToStaticMarkup(
      <OrganizationProfilePreview
        legalName="Example SME Sdn Bhd"
        registrationNumber="202606020001"
        logoImageUrl={exampleSmeProfileImages.logoImageUrl}
        bannerImageUrl={exampleSmeProfileImages.bannerImageUrl}
        profileStatus="Example SME mock imagery selected"
      />,
    )

    expect(html).toContain('Example SME Sdn Bhd')
    expect(html).toContain('202606020001')
    expect(html).toContain('/mock/example-sme-logo.png')
    expect(html).toContain('/mock/example-sme-banner.jpg')
    expect(html).toContain('Example SME mock imagery selected')
  })

  it('accepts PNG and JPG profile image files only', () => {
    expect(
      isSupportedOrganizationProfileImage(
        new File(['logo'], 'company-logo.png', { type: 'image/png' }),
      ),
    ).toBe(true)
    expect(
      isSupportedOrganizationProfileImage(
        new File(['banner'], 'company-banner.jpg', { type: 'image/jpeg' }),
      ),
    ).toBe(true)
    expect(
      isSupportedOrganizationProfileImage(
        new File(['vector'], 'company-logo.svg', { type: 'image/svg+xml' }),
      ),
    ).toBe(false)
  })
})

export const exampleSmeProfileImages = {
  logoImageUrl: '/mock/example-sme-logo.png',
  bannerImageUrl: '/mock/example-sme-banner.jpg',
} as const

const supportedProfileImageTypes = new Set(['image/png', 'image/jpeg'])

export const maxProfileImageBytes = 1_500_000

export function isSupportedOrganizationProfileImage(file: File) {
  return (
    supportedProfileImageTypes.has(file.type) ||
    /\.(png|jpe?g)$/i.test(file.name)
  )
}

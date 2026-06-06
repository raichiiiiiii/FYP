import {
  validateDisplayName,
  validateProfileImageUrl,
} from './account-profile.contract';

describe('account profile contract', () => {
  it('normalizes supported profile image references', () => {
    expect(validateProfileImageUrl(' /mock/avatar.png ')).toBe(
      '/mock/avatar.png',
    );
    expect(validateProfileImageUrl('https://cdn.example.test/avatar.jpg')).toBe(
      'https://cdn.example.test/avatar.jpg',
    );
    expect(validateProfileImageUrl('data:image/png;base64,aGVsbG8=')).toBe(
      'data:image/png;base64,aGVsbG8=',
    );
  });

  it('rejects unsupported profile image references', () => {
    expect(() => validateProfileImageUrl('/mock/avatar.svg')).toThrow(
      'profileImageUrl must reference a png or jpg image',
    );
  });

  it('requires a bounded display name', () => {
    expect(validateDisplayName(' Demo User ')).toBe('Demo User');
    expect(() => validateDisplayName('')).toThrow('displayName is required');
    expect(() => validateDisplayName('x'.repeat(121))).toThrow(
      'displayName must be 120 characters or fewer',
    );
  });
});

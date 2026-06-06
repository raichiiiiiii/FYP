import { validateGraphAnnotationInput } from './graph-annotations.contract';

describe('graph annotation contract', () => {
  it('accepts a saved-view annotation target', () => {
    expect(
      validateGraphAnnotationInput({
        viewId: 'view-1',
        body: 'Reviewer note',
        visibility: 'organization',
      }),
    ).toEqual({
      viewId: 'view-1',
      body: 'Reviewer note',
      visibility: 'organization',
    });
  });

  it('accepts a graph-node annotation target', () => {
    expect(
      validateGraphAnnotationInput({
        nodeEntityType: 'PurchaseOrder',
        nodeEntityId: 'po-1',
        body: 'Procurement note',
      }),
    ).toEqual({
      nodeEntityType: 'PurchaseOrder',
      nodeEntityId: 'po-1',
      body: 'Procurement note',
      visibility: 'private',
    });
  });

  it('rejects missing, mixed, or partial targets', () => {
    expect(() =>
      validateGraphAnnotationInput({
        body: 'Missing target',
      }),
    ).toThrow('Graph annotation target is required');
    expect(() =>
      validateGraphAnnotationInput({
        viewId: 'view-1',
        nodeEntityType: 'Project',
        nodeEntityId: 'project-1',
        body: 'Mixed target',
      }),
    ).toThrow('either a saved view or a graph node');
    expect(() =>
      validateGraphAnnotationInput({
        nodeEntityType: 'Project',
        body: 'Partial target',
      }),
    ).toThrow('nodeEntityType and nodeEntityId');
  });

  it('rejects empty, oversized, or unsupported visibility values', () => {
    expect(() =>
      validateGraphAnnotationInput({
        viewId: 'view-1',
        body: '   ',
      }),
    ).toThrow('body is required');
    expect(() =>
      validateGraphAnnotationInput({
        viewId: 'view-1',
        body: 'x'.repeat(2_001),
      }),
    ).toThrow('2000 characters or less');
    expect(() =>
      validateGraphAnnotationInput({
        viewId: 'view-1',
        body: 'Note',
        visibility: 'public',
      }),
    ).toThrow('Unsupported graph annotation visibility');
  });
});

import { describe, it, expect, expectTypeOf } from 'vitest';
import type {
  Work,
  Author,
  Edition,
  SeriesInfo,
  AggregatedAvailability,
  PhysicalAvailability,
  PhysicalStatus,
  AvailabilityBadge,
  RecommendedAction,
  OLSearchResponse,
  OLDoc,
  CantookItem,
  CantookAvailability,
} from '@/types';

describe('Type system — barrel exports', () => {
  it('should allow creating a valid Work object', () => {
    const edition: Edition = {
      editionId: 'OL123E',
      isbn13: '9780123456789',
      isbn10: null,
      language: 'fr',
      publishYear: 2023,
      publisher: 'Éditions Québec',
      pageCount: 320,
      coverKey: '12345',
    };

    const author: Author = {
      authorId: 'OL123A',
      name: 'Michel Tremblay',
    };

    const work: Work = {
      workId: 'OL1234W',
      title: "Les Belles-Sœurs",
      authors: [author],
      primaryEdition: edition,
      allEditions: [edition],
      allIsbns: ['9780123456789'],
      metadata: {
        subjects: ['Théâtre québécois'],
        firstPublishYear: 1968,
        description: null,
      },
      series: null,
    };

    expect(work.workId).toBe('OL1234W');
    expect(work.authors).toHaveLength(1);
    expect(work.series).toBeNull();
    expectTypeOf(work).toExtend<Work>();
  });

  it('should allow creating a Work with SeriesInfo', () => {
    const series: SeriesInfo = {
      name: 'Harry Potter',
      position: 4,
      siblingWorkIds: ['OL1W', 'OL2W', 'OL3W'],
    };

    expect(series.name).toBe('Harry Potter');
    expect(series.position).toBe(4);
    expectTypeOf(series).toExtend<SeriesInfo>();
  });

  it('should support PhysicalStatus union type', () => {
    const statuses: PhysicalStatus[] = ['available', 'loaned', 'not_in_catalog'];
    expect(statuses).toHaveLength(3);
  });

  it('should support AvailabilityBadge discriminated union', () => {
    const badge: AvailabilityBadge = { type: 'available', label: 'Disponible' };
    expect(badge.type).toBe('available');
  });

  it('should support RecommendedAction discriminated union', () => {
    const action: RecommendedAction = {
      type: 'borrow_digital',
      cantookUrl: 'https://levis.pretnumerique.ca/book/123',
    };
    expect(action.type).toBe('borrow_digital');
  });

  it('should allow creating valid AggregatedAvailability', () => {
    const physical: PhysicalAvailability = {
      status: 'available',
      branches: [{ branchName: 'Lauzon', available: 2, total: 3 }],
      totalCopies: 3,
      availableCopies: 2,
      nextReturnDate: null,
    };

    const availability: AggregatedAvailability = {
      workId: 'OL1234W',
      physical,
      digital: null,
      badge: { type: 'available', label: 'Disponible' },
      recommendedAction: { type: 'reserve_physical', branchOptions: ['Lauzon'] },
      fetchedAt: new Date(),
    };

    expect(availability.physical.status).toBe('available');
    expect(availability.digital).toBeNull();
    expectTypeOf(availability).toExtend<AggregatedAvailability>();
  });

  it('should allow creating valid OLSearchResponse', () => {
    const doc: OLDoc = {
      key: '/works/OL1234W',
      title: 'Test Book',
      author_name: ['Author One'],
      isbn: ['9780123456789'],
    };

    const response: OLSearchResponse = {
      numFound: 1,
      start: 0,
      numFoundExact: true,
      docs: [doc],
    };

    expect(response.numFound).toBe(1);
    expect(response.docs).toHaveLength(1);
    expectTypeOf(response).toExtend<OLSearchResponse>();
  });

  it('should allow creating valid CantookItem', () => {
    const cantookAvailability: CantookAvailability = {
      status: 'available',
      loans_count: 5,
      holds_count: 0,
      copies_count: 3,
    };

    const item: CantookItem = {
      id: 'cantook-123',
      title: 'Livre Numérique',
      authors: [{ name: 'Auteur Test', role: 'author' }],
      cover_url: 'https://levis.cantookstation.com/assets/cover.jpg',
      formats: [{ type: 'epub', drm: 'adobe' }],
      availability: cantookAvailability,
    };

    expect(item.availability.status).toBe('available');
    expect(item.formats).toHaveLength(1);
    expectTypeOf(item).toExtend<CantookItem>();
  });
});

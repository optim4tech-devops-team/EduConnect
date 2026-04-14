import type { AssignmentDto, PostDto, StudentDto, UserDto } from '@/api/client';
import { normalizePhoneNumber } from '@/utils/phone';
import { resolveFixtureAssetUri } from './fixtureAssets';

const FIXTURE_PARENT_PHONE = normalizePhoneNumber('05337102007');
const FIXTURE_PARENT_EMAIL = 'sezer.darendeli@notio.test';
const FIXTURE_CHILD_ID = '66666666-6666-6666-6666-666666666666';
const FIXTURE_CLASS_ID = '55555555-5555-5555-5555-555555555555';
const FIXTURE_CLASS_NAME = 'Harfler Dünyası';
const RANA_PHOTO_1 = resolveFixtureAssetUri(require('../../assets/fixtures/rana-1.jpg'));
const RANA_PHOTO_2 = resolveFixtureAssetUri(require('../../assets/fixtures/rana-2.jpg'));
const RANA_PHOTO_3 = resolveFixtureAssetUri(require('../../assets/fixtures/rana-3.jpg'));
const RANA_PROFILE_PHOTO = resolveFixtureAssetUri(require('../../assets/fixtures/rana-profile.jpg'));

export const FIXTURE_CHILD_AVATAR = RANA_PROFILE_PHOTO;
export const FIXTURE_PARENT_RELATION_LABEL = "Rana'nın babası";

export const FIXTURE_CHILD: StudentDto = {
  id: FIXTURE_CHILD_ID,
  name: 'Rana Darendeli',
  avatarUrl: FIXTURE_CHILD_AVATAR,
  classId: FIXTURE_CLASS_ID,
  className: FIXTURE_CLASS_NAME,
  parentName: 'Sezer Darendeli',
  parentId: '44444444-4444-4444-4444-444444444444',
  badgeCount: 3,
  birthDate: '2020-09-01',
  gender: 'female',
};

export const FIXTURE_PARENT_ASSIGNMENTS: AssignmentDto[] = [
  {
    id: 'fixture-assignment-1',
    title: 'Renk Avı Etkinliği',
    description:
      'Evde kırmızı, sarı ve mavi renklerde üç eşya bulun. Rana ile birlikte isimlerini tekrar edin ve bir fotoğraf çekin.',
    dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2).toISOString(),
    classId: FIXTURE_CLASS_ID,
    teacherId: '33333333-3333-3333-3333-333333333333',
    teacherName: 'Elif Toksoy',
    status: 'Pending',
  },
  {
    id: 'fixture-assignment-2',
    title: 'Aile Fotoğrafı Kolajı',
    description:
      'Rana ile birlikte aile bireylerinin fotoğraflarından küçük bir kolaj hazırlayın ve bir cümle ile anlatın.',
    dueDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
    classId: FIXTURE_CLASS_ID,
    teacherId: '33333333-3333-3333-3333-333333333333',
    teacherName: 'Elif Toksoy',
    status: 'Submitted',
    submittedAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    submissionNote: 'Rana kolaj yaparken çok keyif aldı.',
    submissionFileUrl: 'https://placehold.co/900x1200/png?text=Rana+Kolaj',
  },
];

export const FIXTURE_PARENT_PHOTOS: PostDto[] = [
  {
    id: 'fixture-photo-1',
    mediaUrl: RANA_PHOTO_1,
    thumbnailUrl: RANA_PHOTO_1,
    caption: 'Rana arkadaşlarıyla birlikte sınıf hatırası fotoğrafında çok keyifliydi.',
    classId: FIXTURE_CLASS_ID,
    className: FIXTURE_CLASS_NAME,
    authorId: '33333333-3333-3333-3333-333333333333',
    authorName: 'Elif Toksoy',
    publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    isPublished: true,
    tags: [],
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
  },
  {
    id: 'fixture-photo-2',
    mediaUrl: RANA_PHOTO_2,
    thumbnailUrl: RANA_PHOTO_2,
    caption: 'Renkli sınıf panosu önünde grup etkinliği sonrası çekilen bir başka kare.',
    classId: FIXTURE_CLASS_ID,
    className: FIXTURE_CLASS_NAME,
    authorId: '33333333-3333-3333-3333-333333333333',
    authorName: 'Elif Toksoy',
    publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 28).toISOString(),
    isPublished: true,
    tags: [],
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 29).toISOString(),
  },
  {
    id: 'fixture-photo-3',
    mediaUrl: RANA_PHOTO_3,
    thumbnailUrl: RANA_PHOTO_3,
    caption: 'Rana çiçek panosu önünde bireysel fotoğrafında harika görünüyordu.',
    classId: FIXTURE_CLASS_ID,
    className: FIXTURE_CLASS_NAME,
    authorId: '33333333-3333-3333-3333-333333333333',
    authorName: 'Elif Toksoy',
    publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 52).toISOString(),
    isPublished: true,
    tags: [],
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 53).toISOString(),
  },
];

export function isFixtureParentUser(user?: UserDto | null): boolean {
  if (!user || user.role !== 'Parent') return false;
  const normalizedPhone = user.phone ? normalizePhoneNumber(user.phone) : null;
  return normalizedPhone === FIXTURE_PARENT_PHONE || user.email === FIXTURE_PARENT_EMAIL;
}

export function getFixtureParentRelationLabel(user?: UserDto | null): string | null {
  return isFixtureParentUser(user) ? FIXTURE_PARENT_RELATION_LABEL : null;
}

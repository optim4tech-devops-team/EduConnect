import { Image } from 'react-native';

export function resolveFixtureAssetUri(asset: number): string {
  try {
    return Image.resolveAssetSource(asset)?.uri ?? '';
  } catch {
    return '';
  }
}

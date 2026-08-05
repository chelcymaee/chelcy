import { useEffect, useState } from 'react';
import { Image, Text, View, StyleSheet } from 'react-native';
import { Colors } from '../constants/colors';

interface AvatarProps {
  /** profiles.avatar_url (or null/undefined) — the single source of truth for a person's identity photo. */
  uri?: string | null;
  /** Diameter in px. Defaults to 50 to match the existing message-list avatars. */
  size?: number;
  /** Glyph shown when there's no uri, or the image fails to load. */
  fallbackEmoji?: string;
  /** Override the fallback glyph's font size. Defaults to ~44% of size, matching prior per-screen values. */
  fallbackFontSize?: number;
  /** Override the fallback circle's background color. Defaults to Colors.border. */
  backgroundColor?: string;
  /** Additional style merged onto the fallback glyph's Text (e.g. color, fontWeight) — for screens with a branded initials look to preserve. */
  fallbackTextStyle?: any;
  /**
   * Applied to whichever of Image/View actually renders (e.g. layout margins
   * from the caller). Untyped because it needs to satisfy both Image's and
   * View's style props depending on which one renders; callers should only
   * pass layout-safe properties (margin, etc.), not visual ones already
   * owned by this component (size/shape/background).
   */
  style?: any;
}

/**
 * Shared identity-avatar renderer. Shows the real photo when a uri is
 * present and loads successfully; falls back to a glyph-in-a-circle
 * otherwise (no uri, or the image failed to load).
 *
 * This does not fetch or upload anything — callers are responsible for
 * selecting `avatar_url` in their own query and passing it in.
 */
export default function Avatar({
  uri,
  size = 50,
  fallbackEmoji = '👤',
  fallbackFontSize,
  backgroundColor = Colors.border,
  fallbackTextStyle,
  style,
}: AvatarProps) {
  const [failed, setFailed] = useState(false);

  // Reset failure state when the uri changes (e.g. list item recycled with a
  // different person, or an avatar goes from missing to present).
  useEffect(() => { setFailed(false); }, [uri]);

  const dimensions = { width: size, height: size, borderRadius: size / 2 };

  if (uri && !failed) {
    return (
      <Image
        source={{ uri }}
        style={[dimensions, style]}
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <View style={[dimensions, styles.fallback, { backgroundColor }, style]}>
      <Text style={[{ fontSize: fallbackFontSize ?? size * 0.44 }, fallbackTextStyle]}>{fallbackEmoji}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

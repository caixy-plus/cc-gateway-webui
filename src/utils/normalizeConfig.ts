import type { GatewayConfig, PlatformsMap } from '@/types';

const emptyPlatforms = (): PlatformsMap => ({
  feishu: {
    enabled: false,
    app_id: '',
    app_secret: '',
    require_pairing: true,
  },
  telegram: {
    enabled: false,
    bot_token: '',
    proxy: '',
    require_pairing: true,
  },
});

/** Accept legacy top-level `feishu` / `telegram` from older API responses. */
export function normalizeGatewayConfig(raw: GatewayConfig): GatewayConfig {
  if (raw.platforms) {
    return raw;
  }
  const legacy = raw as GatewayConfig & {
    feishu?: PlatformsMap['feishu'];
    telegram?: PlatformsMap['telegram'];
  };
  return {
    ...raw,
    platforms: {
      feishu: legacy.feishu ?? emptyPlatforms().feishu,
      telegram: legacy.telegram ?? emptyPlatforms().telegram,
    },
  };
}

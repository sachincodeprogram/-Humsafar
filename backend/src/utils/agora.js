const { RtcTokenBuilder, RtcRole } = require('agora-token');

const TOKEN_EXPIRE_SEC = 3600; // 1 hour, enough for one call

function buildRtcToken(channelName, uid) {
  const appId = process.env.AGORA_APP_ID;
  const appCertificate = process.env.AGORA_APP_CERTIFICATE;
  const now = Math.floor(Date.now() / 1000);

  return RtcTokenBuilder.buildTokenWithUid(
    appId,
    appCertificate,
    channelName,
    uid,
    RtcRole.PUBLISHER,
    now + TOKEN_EXPIRE_SEC,
    now + TOKEN_EXPIRE_SEC
  );
}

module.exports = { buildRtcToken };

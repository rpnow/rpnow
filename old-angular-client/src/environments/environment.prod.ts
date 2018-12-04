export const environment = {
  production: true,
  assetRoot: '/client-files/',
  apiUrl: '',
  wsUrl: `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}`,
};

# Gaps met by the startcloud-ui growth

Decisions 94 to 99 are met in the code: the menu, the profile's Favorites tab and the About toggle read and write `GET` and `PUT /api/user/favorites` through the hub client in `snake_case`, `about.js` is off `/api/favorites`, and nothing here reads the config contract's boot line. No open gaps remain.

## From provisioner-catalog

The five lines the growth left in `../provisioner-catalog/notifications.md` are met and removed there: the Worker's `GET /api/status` lists `footer` beside `health` (`worker/src/index.js`, the `features` array), `params.pattern: 'watchId'` stays as the Worker's watch rule name, the `/watches` route stays as it is, the favourites read asks nothing of the Worker, and the globe, About row, polls and chunk names change nothing on this UI backend. The catalog waits on the `bump/startcloud-ui` pull request alone.

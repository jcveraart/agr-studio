# Connect your own Strava

AGR Studio connects through your own Strava API application and OAuth approval. It does not require sharing your Strava password with AGR Studio.

## Setup

1. Start AGR Studio and open **http://127.0.0.1:4177/** in ordinary Chrome. Leave the server running during authorization.
2. Visit [Strava API settings](https://www.strava.com/settings/api). Create or use your API application. You can use AGR Studio Activity Viewer as its name and this repository as its website.
3. Set the **Authorization Callback Domain** to **127.0.0.1**. The app's callback URL is `http://127.0.0.1:4177/api/strava/callback`. Keep the same hostname throughout the flow. If you change the local port, the callback URL changes too.
4. Open the site's **Strava** page. Enter the numeric Client ID and Client Secret in the local settings form, then save. Keep secrets out of chat, GitHub, screenshots and backups.
5. Choose **Connect with Strava** and approve access on Strava. Optional access to private activities requires your separate consent. No write permission is requested.
6. After the browser returns to AGR Studio, confirm the connected status and request recent activities.

The access token shown on your API settings page is not a replacement for the activity authorization flow. OAuth supplies the required scopes and a refresh token. AGR Studio handles token refresh and replacement automatically.

## What the connection does

The page displays up to 30 recent activity summaries. It does not request activity GPS tracks, heart-rate streams or other detailed streams. Requests are cached for 30 seconds; there is no background activity polling.

This integration is an isolated viewer. Strava's current published guidance restricts using API data in AI and analytics/combination workflows. Accordingly, these summaries and their derivatives are excluded from the training planner, AI coaching, training backups and public demo. Enter training feedback independently in the journal. An activity-viewing connection is not evidence that the adaptive planner has analyzed your Strava history.

The scope choice and privacy isolation follow the published guidance reviewed for this implementation. Consult the current policies before extending or distributing a different integration.

## Storage and disconnecting

The local server encrypts credentials and tokens using AES-256-GCM in `.private-strava/`. This folder is ignored by Git. Its key is stored alongside the encrypted file, so someone with access to the entire folder can still decrypt it. Protect access to your computer and do not copy this folder into a public archive.

OAuth uses a short-lived, single-use state check and an HttpOnly, SameSite=Lax local cookie. Activity responses are kept transiently in memory; the integration does not add them to your training local storage. Refreshes are coordinated to prevent simultaneous token replacement races.

**Disconnect** revokes access with Strava and clears the local connection when successful. **Forget locally** clears this app's local connection without proving remote revocation; then remove the application under [Strava's connected apps](https://www.strava.com/settings/apps) yourself. If remote revocation fails, the interface reports that failure rather than claiming completion.

## Troubleshooting

- **Invalid client:** check the ID and secret from your own API app. Save them locally again after rotating the secret.
- **Callback error:** confirm the callback domain, running server and current port. Avoid changing between `localhost` and `127.0.0.1` mid-flow.
- **State expired or missing:** restart Connect from the local page. Complete authorization in the same browser within the displayed authorization window, with cookies enabled.
- **Google sign-in blocked in an embedded browser:** complete authorization in ordinary Chrome.
- **Private activities absent:** reconnect with the optional private activity permission if you want those summaries displayed.
- **Expired or revoked authorization:** reconnect. Normal token expiry is refreshed automatically when a valid refresh token remains available.
- **Rate-limit message:** wait until Strava's limit resets and request again. Repeated refresh clicks do not bypass the service limit.
- **A fresh clone appears disconnected:** connection files are deliberately excluded from the repository. Configure and authorize this installation locally.

## Official references

- [Getting started](https://developers.strava.com/docs/getting-started/)
- [OAuth authentication and scopes](https://developers.strava.com/docs/authentication/)
- [API reference](https://developers.strava.com/docs/reference/)
- [Rate limits](https://developers.strava.com/docs/rate-limits/)
- [Strava API policy](https://www.strava.com/legal/api_policy)

The public screenshot gallery uses a disconnected demo form with no real rider, credentials or activities.

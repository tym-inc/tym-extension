import axios from 'axios';
import { getAuth } from 'firebase/auth';
import { posthogAnalyticsUrl, posthogApiKey } from './secrets';

export function getNonce(): string {
	let text = '';
	const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	for (let i = 0; i < 32; i++) {
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	}
	return text;
}

export function sendTelemetryData(eventName: string, data?: Object) {
	axios.post(
		posthogAnalyticsUrl,
		{
			api_key: posthogApiKey,
			event: eventName,
			properties: {
				distinct_id: getUserEmail(),
				...data
			},
			timestamp: new Date().toISOString()
		},
		{
			headers: { 'Content-Type': 'application/json' }
		}
	);
}

function getUserEmail() {
	return getAuth().currentUser?.email;
}

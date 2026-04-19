// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import remarkMermaid from './src/remark-mermaid.mjs';

// https://astro.build/config
export default defineConfig({
	markdown: {
		remarkPlugins: [remarkMermaid],
	},
	// Starlight のヘッダー左上の "Aphelion" ロゴ / タイトルは、現在のロケールの
	// ルート (`/en`, `/ja`) にリンクするが、このサイトにはロケールルートに
	// コンテンツがない (Home.md は `/en/home/` に配置される) ため 404 となる。
	// ロケールルートアクセスを Home に固定リダイレクトする。
	redirects: {
		'/en': '/en/home/',
		'/ja': '/ja/home/',
	},
	integrations: [
		starlight({
			title: 'Aphelion',
			logo: {
				src: './src/assets/logo.png',
			},
			customCss: ['./src/styles/custom.css'],
			// mermaid 初期化は src/components/Head.astro で npm バンドルを使用。
			// CDN 依存 (jsdelivr.net) と SRI なし読み込みを排除し、securityLevel を strict に変更。
			components: {
				Head: './src/components/Head.astro',
			},
			locales: {
				en: {
					label: 'English',
					lang: 'en',
				},
				ja: {
					label: '日本語',
					lang: 'ja',
				},
			},
			defaultLocale: 'en',
			social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/kirin0198/aphelion-agents' }],
			sidebar: [
				{
					label: 'Overview',
					link: 'home',
					translations: { ja: '概要' },
				},
				{
					label: 'Getting Started',
					link: 'getting-started',
					translations: { ja: 'はじめる' },
				},
				{
					label: 'Architecture',
					link: 'architecture',
					translations: { ja: 'アーキテクチャ' },
				},
				{
					label: 'Triage System',
					link: 'triage-system',
					translations: { ja: 'トリアージシステム' },
				},
				{
					label: 'Agents Reference',
					link: 'agents-reference',
					translations: { ja: 'エージェントリファレンス' },
				},
				{
					label: 'Rules Reference',
					link: 'rules-reference',
					translations: { ja: 'ルールリファレンス' },
				},
				{
					label: 'Platform Guide',
					link: 'platform-guide',
					translations: { ja: 'プラットフォームガイド' },
				},
				{
					label: 'Contributing',
					link: 'contributing',
					translations: { ja: 'コントリビューション' },
				},
			],
		}),
	],
});

// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import remarkMermaid from './src/remark-mermaid.mjs';

// ページ定義を一元管理する配列。
// ページ追加・変更時はここだけ編集すれば sidebar に反映される (SH-009, NI-003)。
/** @type {{ slug: string; labelEn: string; labelJa: string }[]} */
const PAGES = [
	{ slug: 'home',             labelEn: 'Overview',          labelJa: '概要'                   },
	{ slug: 'getting-started',  labelEn: 'Getting Started',   labelJa: 'はじめる'               },
	{ slug: 'architecture',     labelEn: 'Architecture',      labelJa: 'アーキテクチャ'         },
	{ slug: 'triage-system',    labelEn: 'Triage System',     labelJa: 'トリアージシステム'     },
	{ slug: 'agents-reference', labelEn: 'Agents Reference',  labelJa: 'エージェントリファレンス' },
	{ slug: 'rules-reference',  labelEn: 'Rules Reference',   labelJa: 'ルールリファレンス'     },
	{ slug: 'contributing',     labelEn: 'Contributing',      labelJa: 'コントリビューション'   },
];

// PAGES から Starlight sidebar エントリを生成する。
// translations に en/ja 両言語を含めることで英日ラベルの対称性を保証する (NI-003)。
const sidebar = PAGES.map(({ slug, labelEn, labelJa }) => ({
	label: labelEn,
	link: slug,
	translations: { en: labelEn, ja: labelJa },
}));

// https://astro.build/config
export default defineConfig({
	markdown: {
		remarkPlugins: [remarkMermaid],
	},
	// サイトルート `/` は言語切替をサポートするため各ロケールの splash に委譲する。
	// `/en` と `/ja` は Starlight が各ロケールの index.mdx を splash として配信する。
	// 言語スイッチャーは同一スラッグのペア (`/en/` ↔ `/ja/`) 上でのみ機能する。
	redirects: {
		'/': '/en/',
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
			sidebar,
		}),
	],
});

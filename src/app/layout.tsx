import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Providers from '@/components/Providers';
import AppNavigation from '@/components/AppNavigation';
// import './globals.css'; // Disabled due to Turbopack conflicts

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Game Lobby Platform',
  description: 'Connect with friends and play your favorite retro games together',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <style dangerouslySetInnerHTML={{
          __html: `
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              line-height: 1.6;
              color: #fff;
              background-color: #111827;
              min-height: 100vh;
            }
            
            .container {
              max-width: 1200px;
              margin: 0 auto;
              padding: 0 20px;
            }
            
            .bg-gradient-to-br {
              background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
              color: white;
            }
            
            .from-blue-50 {
              background: linear-gradient(135deg, #eff6ff 0%, #f3e8ff 100%);
            }
            
            /* Essential utility classes for lobby */
            .bg-gray-900 { background-color: #111827; }
            .bg-gray-800 { background-color: #1f2937; }
            .bg-gray-700 { background-color: #374151; }
            .text-white { color: #ffffff; }
            .text-gray-300 { color: #d1d5db; }
            .text-gray-400 { color: #9ca3af; }
            .text-blue-400 { color: #60a5fa; }
            .text-green-400 { color: #34d399; }
            .text-red-400 { color: #f87171; }
            .min-h-screen { min-height: 100vh; }
            .flex { display: flex; }
            .items-center { align-items: center; }
            .justify-center { justify-content: center; }
            .text-center { text-align: center; }
            .text-xl { font-size: 1.25rem; }
            .text-2xl { font-size: 1.5rem; }
            .text-4xl { font-size: 2.25rem; }
            .font-bold { font-weight: 700; }
            .font-semibold { font-weight: 600; }
            .rounded-lg { border-radius: 0.5rem; }
            .p-4 { padding: 1rem; }
            .p-6 { padding: 1.5rem; }
            .px-4 { padding-left: 1rem; padding-right: 1rem; }
            .py-8 { padding-top: 2rem; padding-bottom: 2rem; }
            .mb-4 { margin-bottom: 1rem; }
            .mb-8 { margin-bottom: 2rem; }
            .mr-2 { margin-right: 0.5rem; }
            .mt-4 { margin-top: 1rem; }
            .grid { display: grid; }
            .gap-8 { gap: 2rem; }
            .animate-spin {
              animation: spin 1s linear infinite;
            }
            @keyframes spin {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
            .border-b-2 { border-bottom-width: 2px; }
            .border-blue-400 { border-color: #60a5fa; }
            .rounded-full { border-radius: 9999px; }
            .h-8 { height: 2rem; }
            .w-8 { width: 2rem; }
            .mx-auto { margin-left: auto; margin-right: auto; }
            .container { max-width: 1200px; margin: 0 auto; }
            
            /* Button styles */
            button {
              cursor: pointer;
              border: none;
              border-radius: 0.375rem;
              font-weight: 500;
              transition: all 0.2s;
              display: inline-flex;
              align-items: center;
              justify-content: center;
            }
            
            .bg-blue-600 {
              background-color: #2563eb;
              color: white;
              padding: 0.5rem 1rem;
            }
            .bg-blue-600:hover {
              background-color: #1d4ed8;
            }
            
            .bg-blue-700 {
              background-color: #1d4ed8;
            }
            
            .bg-purple-600 {
              background-color: #9333ea;
              color: white;
              padding: 0.5rem 1rem;
            }
            .bg-purple-600:hover {
              background-color: #7c3aed;
            }
            
            .bg-purple-700 {
              background-color: #7c3aed;
            }
            
            .bg-green-600 {
              background-color: #16a34a;
              color: white;
              padding: 0.5rem 1rem;
            }
            .bg-green-600:hover {
              background-color: #15803d;
            }
            
            .bg-green-700 {
              background-color: #15803d;
            }
            
            .bg-gray-600 {
              background-color: #4b5563;
              color: white;
              padding: 0.5rem 1rem;
            }
            .bg-gray-600:hover {
              background-color: #374151;
            }
            
            .bg-gray-700 {
              background-color: #374151;
            }
            
            .bg-red-600 {
              background-color: #dc2626;
              color: white;
              padding: 0.5rem 1rem;
            }
            .bg-red-600:hover {
              background-color: #b91c1c;
            }
            
            .bg-red-700 {
              background-color: #b91c1c;
            }
            
            /* Additional utility classes */
            .py-2 { padding-top: 0.5rem; padding-bottom: 0.5rem; }
            .px-2 { padding-left: 0.5rem; padding-right: 0.5rem; }
            .px-3 { padding-left: 0.75rem; padding-right: 0.75rem; }
            .py-3 { padding-top: 0.75rem; padding-bottom: 0.75rem; }
            .py-1 { padding-top: 0.25rem; padding-bottom: 0.25rem; }
            .space-x-2 > * + * { margin-left: 0.5rem; }
            .space-x-4 > * + * { margin-left: 1rem; }
            .space-y-1 > * + * { margin-top: 0.25rem; }
            .space-y-4 > * + * { margin-top: 1rem; }
            .w-4 { width: 1rem; }
            .h-4 { height: 1rem; }
            .w-6 { width: 1.5rem; }
            .h-6 { height: 1.5rem; }
            .w-12 { width: 3rem; }
            .h-12 { height: 3rem; }
            .w-16 { width: 4rem; }
            .h-16 { height: 4rem; }
            .w-3 { width: 0.75rem; }
            .h-3 { height: 0.75rem; }
            .w-full { width: 100%; }
            .text-sm { font-size: 0.875rem; }
            .text-base { font-size: 1rem; }
            .text-lg { font-size: 1.125rem; }
            .rounded-md { border-radius: 0.375rem; }
            .object-cover { object-fit: cover; }
            .relative { position: relative; }
            .absolute { position: absolute; }
            .bottom-0 { bottom: 0; }
            .right-0 { right: 0; }
            .left-0 { left: 0; }
            .top-0 { top: 0; }
            .z-50 { z-index: 50; }
            .shadow-lg { box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05); }
            .transition-colors { transition: color 0.15s ease-in-out, background-color 0.15s ease-in-out; }
            .transition-transform { transition: transform 0.15s ease-in-out; }
            .transform { transform: translateX(var(--tw-translate-x, 0)) translateY(var(--tw-translate-y, 0)) rotate(var(--tw-rotate, 0)) skewX(var(--tw-skew-x, 0)) skewY(var(--tw-skew-y, 0)) scaleX(var(--tw-scale-x, 1)) scaleY(var(--tw-scale-y, 1)); }
            .rotate-180 { --tw-rotate: 180deg; }
            .max-w-2xl { max-width: 42rem; }
            .block { display: block; }
            .hidden { display: none; }
            .inline-flex { display: inline-flex; }
            .justify-between { justify-content: space-between; }
            .capitalize { text-transform: capitalize; }
            .focus\\:outline-none:focus { outline: none; }
            .hover\\:bg-gray-100:hover { background-color: #f3f4f6; }
            .hover\\:text-white:hover { color: #ffffff; }
            .hover\\:bg-gray-700:hover { background-color: #374151; }
            .text-gray-700 { color: #374151; }
            .bg-white { background-color: #ffffff; }
            .border-2 { border-width: 2px; }
            .border-gray-900 { border-color: #111827; }
            .bg-green-500 { background-color: #22c55e; }
            .bg-gray-500 { background-color: #6b7280; }
            .text-green-400 { color: #4ade80; }
            
            /* Toggle switch styles */
            .toggle-switch {
              position: relative;
              display: inline-block;
              width: 60px;
              height: 34px;
            }
            
            .toggle-switch input {
              opacity: 0;
              width: 0;
              height: 0;
            }
            
            .toggle-slider {
              position: absolute;
              cursor: pointer;
              top: 0;
              left: 0;
              right: 0;
              bottom: 0;
              background-color: #374151;
              transition: 0.4s;
              border-radius: 34px;
            }
            
            .toggle-slider:before {
              position: absolute;
              content: "";
              height: 26px;
              width: 26px;
              left: 4px;
              bottom: 4px;
              background-color: white;
              transition: 0.4s;
              border-radius: 50%;
            }
            
            input:checked + .toggle-slider {
              background-color: #22c55e;
            }
            
            input:checked + .toggle-slider:before {
              transform: translateX(26px);
            }
            
            /* Focus styles */
            input:focus + .toggle-slider {
              box-shadow: 0 0 1px #22c55e;
            }
            
            @media (max-width: 767px) {
              .md\\:hidden { display: block; }
              .hidden { display: none; }
              .mobile-menu-button { display: inline-flex; }
              .desktop-nav { display: none; }
              .mobile-menu-dropdown { display: block; }
            }
            
            @media (min-width: 768px) {
              .md\\:hidden { display: none !important; }
              .md\\:flex { display: flex !important; }
              .md\\:grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
              .mobile-menu-button { display: none; }
              .desktop-nav { display: flex; }
              .mobile-menu-dropdown { display: none; }
            }
            
            /* Mobile menu specific styles */
            .mobile-menu-dropdown {
              background-color: #1f2937;
              border-top: 1px solid #374151;
            }
            
            @media (min-width: 1024px) {
              .lg\\:col-span-2 { grid-column: span 2 / span 2; }
              .grid-cols-1 { grid-template-columns: repeat(1, minmax(0, 1fr)); }
              .lg\\:grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
            }
            
            .to-purple-50 {
              background: linear-gradient(135deg, #eff6ff 0%, #f3e8ff 100%);
            }
            
            .min-h-screen {
              min-height: 100vh;
            }
            
            .bg-white {
              background-color: white;
            }
            
            .bg-gray-50 {
              background-color: #f9fafb;
            }
            
            .bg-gray-100 {
              background-color: #f3f4f6;
            }
            
            .bg-blue-50 {
              background-color: #eff6ff;
            }
            
            .bg-blue-100 {
              background-color: #dbeafe;
            }
            
            .bg-blue-600 {
              background-color: #2563eb;
            }
            
            .bg-blue-700 {
              background-color: #1d4ed8;
            }
            
            .bg-green-100 {
              background-color: #dcfce7;
            }
            
            .bg-purple-100 {
              background-color: #f3e8ff;
            }
            
            .text-green-600 {
              color: #16a34a;
            }
            
            .text-purple-600 {
              color: #9333ea;
            }
            
            .text-blue-100 {
              color: #dbeafe;
            }
            
            .hover\\:bg-blue-700:hover {
              background-color: #1d4ed8;
            }
            
            .hover\\:bg-gray-50:hover {
              background-color: #f9fafb;
            }
            
            .text-white {
              color: white;
            }
            
            .text-gray-600 {
              color: #4b5563;
            }
            
            .text-gray-700 {
              color: #374151;
            }
            
            .text-gray-900 {
              color: #111827;
            }
            
            .text-blue-600 {
              color: #2563eb;
            }
            
            .border-blue-600 {
              border-color: #2563eb;
            }
            
            .border-2 {
              border-width: 2px;
            }
            
            .border {
              border-width: 1px;
            }
            
            .border-gray-300 {
              border-color: #d1d5db;
            }
            
            .rounded-lg {
              border-radius: 0.5rem;
            }
            
            .rounded-xl {
              border-radius: 0.75rem;
            }
            
            .rounded-2xl {
              border-radius: 1rem;
            }
            
            .shadow-lg {
              box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
            }
            
            .shadow-sm {
              box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
            }
            
            .btn-primary {
              background-color: #2563eb;
              color: white;
              padding: 1rem 2rem;
              border-radius: 0.5rem;
              font-weight: 600;
              font-size: 1.125rem;
              text-decoration: none;
              display: inline-block;
              transition: background-color 0.2s ease;
              border: none;
              cursor: pointer;
            }
            
            .btn-primary:hover {
              background-color: #1d4ed8;
            }
            
            .btn-secondary {
              background-color: white;
              color: #2563eb;
              padding: 1rem 2rem;
              border: 2px solid #2563eb;
              border-radius: 0.5rem;
              font-weight: 600;
              font-size: 1.125rem;
              text-decoration: none;
              display: inline-block;
              transition: background-color 0.2s ease;
              cursor: pointer;
            }
            
            .btn-secondary:hover {
              background-color: #f9fafb;
            }
            
            .text-center { text-align: center; }
            .text-left { text-align: left; }
            .mb-2 { margin-bottom: 0.5rem; }
            .mb-3 { margin-bottom: 0.75rem; }
            .mb-4 { margin-bottom: 1rem; }
            .mb-6 { margin-bottom: 1.5rem; }
            .mb-8 { margin-bottom: 2rem; }
            .mb-16 { margin-bottom: 4rem; }
            .mt-4 { margin-top: 1rem; }
            .mt-6 { margin-top: 1.5rem; }
            .mt-8 { margin-top: 2rem; }
            .py-2 { padding: 1rem 0; }
            .py-3 { padding: 0.75rem 0; }
            .py-4 { padding: 1rem 0; }
            .py-6 { padding: 1.5rem 0; }
            .py-8 { padding: 2rem 0; }
            .py-12 { padding: 3rem 0; }
            .py-16 { padding: 4rem 0; }
            .px-2 { padding: 0 0.5rem; }
            .px-3 { padding: 0 0.75rem; }
            .px-4 { padding: 0 1rem; }
            .px-6 { padding: 0 1.5rem; }
            .px-8 { padding: 0 2rem; }
            .p-4 { padding: 1rem; }
            .p-6 { padding: 1.5rem; }
            .p-8 { padding: 2rem; }
            .flex { display: flex; }
            .inline-flex { display: inline-flex; }
            .grid { display: grid; }
            .hidden { display: none; }
            .flex-col { flex-direction: column; }
            .flex-row { flex-direction: row; }
            .items-start { align-items: flex-start; }
            .items-center { align-items: center; }
            .items-end { align-items: flex-end; }
            .justify-start { justify-content: flex-start; }
            .justify-center { justify-content: center; }
            .justify-between { justify-content: space-between; }
            .justify-end { justify-content: flex-end; }
            .gap-2 { gap: 0.5rem; }
            .gap-3 { gap: 0.75rem; }
            .gap-4 { gap: 1rem; }
            .gap-6 { gap: 1.5rem; }
            .gap-8 { gap: 2rem; }
            .font-medium { font-weight: 500; }
            .font-semibold { font-weight: 600; }
            .font-bold { font-weight: 700; }
            .text-xs { font-size: 0.75rem; }
            .text-sm { font-size: 0.875rem; }
            .text-base { font-size: 1rem; }
            .text-lg { font-size: 1.125rem; }
            .text-xl { font-size: 1.25rem; }
            .text-2xl { font-size: 1.5rem; }
            .text-3xl { font-size: 1.875rem; }
            .text-4xl { font-size: 2.25rem; }
            .text-5xl { font-size: 3rem; }
            .max-w-xs { max-width: 20rem; }
            .max-w-sm { max-width: 24rem; }
            .max-w-md { max-width: 28rem; }
            .max-w-lg { max-width: 32rem; }
            .max-w-xl { max-width: 36rem; }
            .max-w-2xl { max-width: 42rem; }
            .max-w-4xl { max-width: 56rem; }
            .max-w-6xl { max-width: 72rem; }
            .mx-auto { margin-left: auto; margin-right: auto; }
            .w-4 { width: 1rem; }
            .w-5 { width: 1.25rem; }
            .w-6 { width: 1.5rem; }
            .w-8 { width: 2rem; }
            .w-12 { width: 3rem; }
            .w-16 { width: 4rem; }
            .w-20 { width: 5rem; }
            .w-full { width: 100%; }
            .h-4 { height: 1rem; }
            .h-5 { height: 1.25rem; }
            .h-6 { height: 1.5rem; }
            .h-8 { height: 2rem; }
            .h-12 { height: 3rem; }
            .h-16 { height: 4rem; }
            .h-20 { height: 5rem; }
            .transition-colors { transition: background-color 0.2s, color 0.2s; }
            .transition-all { transition: all 0.2s; }
            .cursor-pointer { cursor: pointer; }
            
            /* Grid system */
            .grid-cols-1 { grid-template-columns: repeat(1, minmax(0, 1fr)); }
            .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
            .grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
            .grid-cols-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
            
            /* Responsive */
            @media (min-width: 640px) {
              .sm\\:flex-row { flex-direction: row; }
              .sm\\:grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
            }
            
            @media (min-width: 768px) {
              .md\\:grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
              .md\\:grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
              .md\\:grid-cols-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
              .md\\:flex-row { flex-direction: row; }
              .md\\:text-left { text-align: left; }
            }
            
            @media (min-width: 1024px) {
              .lg\\:grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
              .lg\\:grid-cols-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
            }
            
            /* Form styles */
            input, select, textarea {
              width: 100%;
              padding: 0.75rem;
              border: 1px solid #d1d5db;
              border-radius: 0.5rem;
              font-size: 1rem;
              transition: border-color 0.2s;
            }
            
            input:focus, select:focus, textarea:focus {
              outline: none;
              border-color: #2563eb;
              box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
            }
            
            button {
              cursor: pointer;
              font-weight: 500;
              padding: 0.75rem 1.5rem;
              border-radius: 0.5rem;
              border: none;
              transition: all 0.2s;
            }
            
            button:hover {
              transform: translateY(-1px);
            }
            
            /* Card styles */
            .card {
              background: white;
              border-radius: 0.75rem;
              padding: 1.5rem;
              box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
              transition: all 0.2s;
            }
            
            .card:hover {
              transform: translateY(-2px);
              box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
            }
            
            /* Links */
            a {
              text-decoration: none;
              transition: all 0.2s;
            }
            
            a:hover {
              transform: translateY(-1px);
            }
            
            /* Navigation styles */
            .nav {
              background: white;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
              padding: 1rem 0;
              margin-bottom: 0;
            }
            
            .nav-container {
              display: flex;
              justify-content: space-between;
              align-items: center;
              max-width: 1200px;
              margin: 0 auto;
              padding: 0 20px;
            }
            
            .nav-brand {
              font-size: 1.5rem;
              font-weight: bold;
              color: #2563eb;
              text-decoration: none;
            }
            
            .nav-links {
              display: flex;
              gap: 2rem;
              list-style: none;
            }
            
            .nav-link {
              color: #666;
              text-decoration: none;
              font-weight: 500;
              transition: color 0.2s;
            }
            
            .nav-link:hover {
              color: #2563eb;
            }
          `
        }} />
      </head>
      <body className={inter.className}>
        <Providers>
          <AppNavigation />
          <main>
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}

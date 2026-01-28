"use client";
import GridShape from "@/components/common/GridShape";
import ThemeTogglerTwo from "@/components/common/ThemeTogglerTwo";

import { ThemeProvider } from "@/context/ThemeContext";
import Image from "next/image";
import Link from "next/link";
import React from "react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative p-6 bg-white z-1 dark:bg-gray-900 sm:p-0">
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Tajawal:wght@400;500;700&family=Cairo:wght@400;600;700&display=swap');
      `}</style>
      <ThemeProvider>
        <div className="relative flex lg:flex-row w-full h-screen justify-center flex-col  dark:bg-gray-900 sm:p-0">
          {children}
          <div className="lg:w-1/2 w-full h-full relative lg:grid items-center hidden overflow-hidden" style={{ background: 'linear-gradient(to bottom right, #abb8c3, #8a9ba8, #6b7c8d)' }}>
            {/* Animated Background Pattern */}
            <div className="absolute inset-0 z-0">
              {/* Geometric Grid Pattern */}
              <div className="absolute inset-0 opacity-20" style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.6'%3E%3Cpath d='M50 50c0-5.523 4.477-10 10-10s10 4.477 10 10-4.477 10-10 10c0 5.523-4.477 10-10 10s-10-4.477-10-10 4.477-10 10-10zM10 10c0-5.523 4.477-10 10-10s10 4.477 10 10-4.477 10-10 10c0 5.523-4.477 10-10 10S0 25.523 0 20s4.477-10 10-10zm10 8c4.418 0 8-3.582 8-8s-3.582-8-8-8-8 3.582-8 8 3.582 8 8 8zm40 40c4.418 0 8-3.582 8-8s-3.582-8-8-8-8 3.582-8 8 3.582 8 8 8z' /%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                backgroundSize: '80px 80px'
              }} />
              
              {/* Hexagon Pattern Overlay */}
              <div className="absolute inset-0 opacity-10" style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M50 10 L90 30 L90 70 L50 90 L10 70 L10 30 Z' fill='none' stroke='%23ffffff' stroke-width='1' opacity='0.5'/%3E%3C/svg%3E")`,
                backgroundSize: '100px 100px'
              }} />

              {/* Gradient Orbs */}
              <div className="absolute top-0 -left-20 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-pulse" />
              <div className="absolute bottom-0 -right-20 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-white/5 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '2s' }} />
            </div>
            
            {/* Glass Effect Cards */}
            <div className="absolute inset-0 z-0 opacity-30">
              <div className="absolute top-20 left-20 w-32 h-32 bg-white/10 backdrop-blur-sm rounded-2xl rotate-12 animate-float" />
              <div className="absolute bottom-40 right-32 w-24 h-24 bg-white/10 backdrop-blur-sm rounded-2xl -rotate-12 animate-float" style={{ animationDelay: '1.5s' }} />
              <div className="absolute top-1/3 right-20 w-20 h-20 bg-white/10 backdrop-blur-sm rounded-full animate-float" style={{ animationDelay: '0.8s' }} />
            </div>
            
            <div className="relative items-center justify-center flex z-10">
              <div className="flex flex-col items-center max-w-md px-6">
                {/* Logo with Glass Effect */}
                <div className="mb-8 p-6 rounded-3xl bg-white/10 backdrop-blur-md border border-white/20 shadow-2xl">
                  <Link href="/" className="block">
                    <Image
                      width={231}
                      height={48}
                      src="/logo.png"
                      alt="logo"
                      className="drop-shadow-2xl"
                    />
                  </Link>
                </div>
                
                {/* Arabic Title */}
                <h2 className="text-center text-5xl font-bold text-white mb-6 drop-shadow-2xl" style={{ direction: 'rtl', fontFamily: "'Amiri', 'Tajawal', 'Cairo', serif", letterSpacing: '0.02em', lineHeight: '1.3' }}>
                  غذاء السلطان
                </h2>
                
                {/* Description with Glass Effect */}
                <div className="p-6 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 shadow-xl">
                  <p className="text-center text-white/95 text-xl leading-relaxed drop-shadow-lg" style={{ direction: 'rtl', fontFamily: "'Tajawal', 'Cairo', 'Amiri', sans-serif", lineHeight: '1.8' }}>
                    شركة سعودية رائدة في قطاع الأغذية والمشروبات بدأت انطلاقتها عام 2004
                  </p>
                </div>

                {/* Feature Icons */}
                <div className="mt-10 flex gap-6 items-center justify-center">
                  <div className="group p-4 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 transition-all cursor-pointer">
                    <svg className="w-8 h-8 text-white drop-shadow-lg group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <div className="group p-4 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 transition-all cursor-pointer">
                    <svg className="w-8 h-8 text-white drop-shadow-lg group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div className="group p-4 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 transition-all cursor-pointer">
                    <svg className="w-8 h-8 text-white drop-shadow-lg group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="fixed bottom-6 right-6 z-50 hidden sm:block">
            <ThemeTogglerTwo />
          </div>
        </div>
      </ThemeProvider>
    </div>
  );
}

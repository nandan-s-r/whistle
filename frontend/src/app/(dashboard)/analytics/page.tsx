"use client";

import React from 'react';
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';

const burnArrData = [
  { name: 'Jan', burn: 65000, arr: 12000 },
  { name: 'Feb', burn: 59000, arr: 18000 },
  { name: 'Mar', burn: 45000, arr: 29000 },
  { name: 'Apr', burn: 30000, arr: 42000 },
  { name: 'May', burn: 28000, arr: 46000 },
  { name: 'Jun', burn: 25000, arr: 52000 },
  { name: 'Jul', burn: 21000, arr: 56000 },
  { name: 'Aug', burn: 19000, arr: 61000 },
  { name: 'Sep', burn: 18000, arr: 62000 },
  { name: 'Oct', burn: 15000, arr: 64000 },
  { name: 'Nov', burn: 12000, arr: 66000 },
  { name: 'Dec', burn: 10000, arr: 68000 },
];

const acquisitionData = [
  { name: 'Jan', cac: 400, ltv: 2400, organic: 1200 },
  { name: 'Feb', cac: 380, ltv: 2500, organic: 1300 },
  { name: 'Mar', cac: 320, ltv: 2800, organic: 1500 },
  { name: 'Apr', cac: 300, ltv: 3100, organic: 1800 },
  { name: 'May', cac: 290, ltv: 3200, organic: 1900 },
  { name: 'Jun', cac: 280, ltv: 3400, organic: 2100 },
  { name: 'Jul', cac: 250, ltv: 3500, organic: 2200 },
];

export default function AnalyticsDashboard() {
  return (
    <div style={{ backgroundColor: 'var(--theme-canvas)', minHeight: '100vh', padding: '2rem', color: 'var(--theme-text)', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.2rem', letterSpacing: '2px', fontWeight: 'bold' }}>
          PORTFOLIO: <span style={{ color: 'var(--theme-link)' }}>LAST 12 MONTHS MEDIAN </span><span style={{ fontSize: '0.8rem' }}>▼</span>
        </h1>
        <div style={{ display: 'flex', gap: '1rem', color: 'var(--theme-muted)' }}>
          <span style={{ cursor: 'pointer' }}>📺</span>
          <span style={{ cursor: 'pointer' }}>🔄</span>
          <span style={{ cursor: 'pointer' }}>❓</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '3rem' }}>
        {/* Left Chart */}
        <div style={{ backgroundColor: 'var(--theme-surface)', padding: '1.5rem', borderRadius: '8px', border: '1px solid var(--theme-border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', fontSize: '0.8rem', color: 'var(--theme-muted)', fontWeight: 'bold', letterSpacing: '1px' }}>
            <span>BURN RATE VS ARR GROWTH</span>
            <span>⚙ OPTIONS</span>
          </div>
          
          <div style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={burnArrData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <CartesianGrid stroke="var(--theme-border)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" stroke="var(--theme-muted)" tick={{ fill: 'var(--theme-muted)', fontSize: 10 }} />
                <YAxis yAxisId="left" stroke="var(--theme-muted)" tick={{ fill: 'var(--theme-muted)', fontSize: 10 }} tickFormatter={(val) => `$${val/1000}k`} />
                <YAxis yAxisId="right" orientation="right" stroke="var(--theme-muted)" tick={{ fill: 'var(--theme-muted)', fontSize: 10 }} tickFormatter={(val) => `$${val/1000}k`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--theme-surface)', color: 'var(--theme-text)', borderRadius: '4px', border: 'none', fontWeight: 'bold' }}
                  itemStyle={{ color: 'var(--theme-text)' }}
                />
                <Bar yAxisId="left" dataKey="burn" fill="var(--theme-link)" barSize={20} radius={[2, 2, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="arr" stroke="var(--theme-risk)" strokeWidth={3} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', fontSize: '0.8rem', marginTop: '1rem' }}>
            <span style={{ color: 'var(--theme-link)' }}>● Monthly Burn</span>
            <span style={{ color: 'var(--theme-risk)' }}>— ARR Growth</span>
          </div>
        </div>

        {/* Right Chart */}
        <div style={{ backgroundColor: 'var(--theme-surface)', padding: '1.5rem', borderRadius: '8px', border: '1px solid var(--theme-border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', fontSize: '0.8rem', color: 'var(--theme-muted)', fontWeight: 'bold', letterSpacing: '1px' }}>
            <span>CUSTOMER ACQUISITION VS LTV</span>
            <span>⚙ OPTIONS</span>
          </div>
          
          <div style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={acquisitionData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <CartesianGrid stroke="var(--theme-border)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" stroke="var(--theme-muted)" tick={{ fill: 'var(--theme-muted)', fontSize: 10 }} />
                <YAxis stroke="var(--theme-muted)" tick={{ fill: 'var(--theme-muted)', fontSize: 10 }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--theme-border)', borderColor: 'var(--theme-border)', color: 'var(--theme-text)' }}
                />
                <Area type="monotone" dataKey="ltv" stroke="var(--theme-verified)" fill="var(--theme-verified)" fillOpacity={0.1} strokeWidth={2} />
                <Area type="monotone" dataKey="organic" stroke="var(--theme-link)" fill="var(--theme-link)" fillOpacity={0.1} strokeWidth={2} />
                <Area type="monotone" dataKey="cac" stroke="var(--theme-risk)" fill="var(--theme-risk)" fillOpacity={0.3} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', fontSize: '0.8rem', marginTop: '1rem' }}>
            <span style={{ color: 'var(--theme-risk)' }}>— Blended CAC</span>
            <span style={{ color: 'var(--theme-verified)' }}>— Lifetime Value (LTV)</span>
          </div>
        </div>
      </div>

      {/* Bottom Stats Section */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        
        {/* Stats Left */}
        <div style={{ backgroundColor: 'var(--theme-surface)', padding: '1.5rem', borderRadius: '8px', border: '1px solid var(--theme-border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', fontSize: '0.8rem', color: 'var(--theme-muted)', fontWeight: 'bold', letterSpacing: '1px' }}>
            <span>PORTFOLIO METRICS</span>
            <span>⚙ OPTIONS</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--theme-border)', paddingBottom: '0.5rem', marginBottom: '1.5rem' }}>
            <div>
              <div style={{ color: 'var(--theme-link)', fontSize: '0.8rem' }}>Median Burn (L3M)</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'var(--theme-link)' }}>$22.5k</div>
            </div>
            <div>
              <div style={{ color: 'var(--theme-risk)', fontSize: '0.8rem' }}>Median ARR Growth</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'var(--theme-risk)' }}>2.7x YoY</div>
            </div>
            <div>
              <div style={{ color: 'var(--theme-text)', fontSize: '0.8rem' }}>LTV:CAC Ratio</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'var(--theme-text)' }}>4.6</div>
            </div>
          </div>
        </div>

        {/* Stats Right */}
        <div style={{ backgroundColor: 'var(--theme-surface)', padding: '1.5rem', borderRadius: '8px', border: '1px solid var(--theme-border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', fontSize: '0.8rem', color: 'var(--theme-muted)', fontWeight: 'bold', letterSpacing: '1px' }}>
            <span>DEAL PIPELINE PERFORMANCE</span>
            <span>⚙ OPTIONS</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--theme-border)', paddingBottom: '0.5rem', marginBottom: '1.5rem' }}>
            <div>
              <div style={{ color: 'var(--theme-verified)', fontSize: '0.8rem' }}>Deals Sourced</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'var(--theme-verified)' }}>479</div>
            </div>
            <div>
              <div style={{ color: 'var(--theme-text)', fontSize: '0.8rem' }}>Avg Triage Time</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'var(--theme-text)' }}>17min</div>
            </div>
            <div>
              <div style={{ color: 'var(--theme-link)', fontSize: '0.8rem' }}>Term Sheets</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'var(--theme-link)' }}>4</div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}


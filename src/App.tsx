/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { 
  CheckCircle2, 
  AlertTriangle, 
  AlertCircle, 
  Send, 
  RefreshCcw, 
  Mail, 
  MessageSquare,
  X,
  Copy,
  Check,
  Lock,
  LogOut
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Status, Community, STATUS_COLORS, COMMUNITIES, USER_REGISTRY } from './types';

const DisneyNavy = '#002244';
const LOGO_URL = 'https://sites.disney.com/app/uploads/sites/77/2024/11/Disney-Central-scaled.jpg'; // Disney Central logo URL
const EMAIL_LOGO_URL = 'https://www.pngkey.com/png/full/230-2305796_book-your-ticket-monsters-inc-characters.png'; // Monsters Inc logo for email

export default function App() {
  const [view, setView] = useState<'hub' | 'tv'>(() => {
    return window.location.pathname === '/tv' ? 'tv' : 'hub';
  });

  const [user, setUser] = React.useState<{ id: string; name: string } | null>(() => {
    if (window.location.pathname === '/tv') return { id: 'tv', name: 'TV Monitor' };
    const saved = localStorage.getItem('dc_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [idInput, setIdInput] = useState('');
  const [loginError, setLoginError] = useState(false);

  const [communities, setCommunities] = useState<Community[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch initial state and poll for updates
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchState = async () => {
      try {
        const res = await fetch('/api/communities', { 
          cache: 'no-store',
          headers: {
            'Accept': 'application/json'
          }
        });
        
        if (!isMounted) return;

        if (!res.ok) {
          const text = await res.text();
          throw new Error(`Server responded with ${res.status}: ${text.slice(0, 50)}`);
        }
        
        const contentType = res.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          const text = await res.text();
          throw new Error(`Invalid response type: ${contentType}`);
        }
        
        const data = await res.json();
        if (isMounted) {
          setCommunities(data);
          setIsLoading(false);
          setFetchError(null);
        }
      } catch (err) {
        if (isMounted) {
          console.error('Fetch error:', err);
          setFetchError(err instanceof Error ? err.message : 'Load failed');
          // If it's the first load and it fails, we move out of loading state to show error
          if (communities.length === 0) {
            setIsLoading(false);
          }
        }
      }
    };

    fetchState();
    const interval = setInterval(fetchState, 5000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const [showModal, setShowModal] = useState(false);
  const [copiedType, setCopiedType] = useState<'email' | 'teams' | 'rich' | 'teams-rich' | 'teams-text' | null>(null);

  const updatedCommunities = useMemo(() => {
    const priority: Record<string, number> = {
      'Red - Critical': 1,
      'Yellow - High Volume': 2,
      'Green - Normal': 3
    };
    return communities
      .filter(c => c.isUpdated)
      .sort((a, b) => (priority[a.status] || 99) - (priority[b.status] || 99));
  }, [communities]);

  const generatePlainTextSummary = () => {
    return updatedCommunities.map(c => `• ${c.name}: ${c.status}`).join('\n');
  };

  const handleSendOutlook = async () => {
    // mailto: links do not support HTML bodies. 
    // The best approach is to copy the rich HTML to the clipboard 
    // and then open Outlook so the user can just paste.
    await copyRichTextToClipboard('email');
    
    const subject = encodeURIComponent("Disney Central Phase Alert Update");
    // We leave the body empty or with a small hint so the user can paste the rich content
    const body = encodeURIComponent("PLEASE ERASE THIS TEXT AND PASTE THE ALERT HERE (Ctrl+V)");
    
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
    
    // Provide feedback that it was copied
    setCopiedType('rich');
    setTimeout(() => setCopiedType(null), 3000);
  };

  const generateTeamsTextHTML = () => {
    const priority = getHighestPriority();
    const statusColorMap: Record<string, string> = {
      'Green - Normal': '#008A00',
      'Yellow - High Volume': '#FFCC00',
      'Red - Critical': '#D2122E',
    };

    const rows = updatedCommunities.map(c => {
      const statusColor = statusColorMap[c.status];
      return `
        <div style="margin-bottom: 4px; font-size: 14px; font-family: 'Segoe UI', system-ui, sans-serif;">
          <span style="color: #002244 !important; font-weight: 700;">${c.name}:</span> 
          <span style="color: ${statusColor} !important; font-weight: 700;">${c.status}</span>
        </div>
      `;
    }).join('');

    const activeStatuses = Array.from(new Set(updatedCommunities.map(c => c.status))) as Status[];
    const guidelineItems = activeStatuses.map(status => {
      const colorMap: Record<string, string> = {
        'Green - Normal': '#008A00',
        'Yellow - High Volume': '#856404',
        'Red - Critical': '#D2122E',
      };
      const color = colorMap[status];

      let text = "";
      if (status === 'Green - Normal') text = "🟢 GREEN: Maintain & Open. Unplanned shrinkage is OPEN.";
      else if (status === 'Yellow - High Volume') text = "🟡 YELLOW: Monitor & Restrict. Unplanned shrinkage is CLOSED.";
      else if (status === 'Red - Critical') text = "🔴 RED: Critical & Reschedule. Unplanned shrinkage is STRICTLY CLOSED.";
      
      return `<div style="font-size: 12px; color: ${color} !important; margin-bottom: 4px; line-height: 1.2; font-weight: 600; font-family: 'Segoe UI', system-ui, sans-serif;">${text}</div>`;
    }).join('');

    return `
      <div style="font-family: 'Segoe UI', system-ui, sans-serif; color: #323130;">
        <div style="font-size: 16px; font-weight: bold; color: #002244; margin-bottom: 12px;">Disney Central Phase Alert Update</div>
        <div style="margin-bottom: 16px;">
          ${rows}
        </div>
        <div style="border-top: 1px solid #EDEBE9; padding-top: 12px;">
          <div style="font-size: 12px; font-weight: bold; color: #605E5C; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">Phase Guidelines</div>
          ${guidelineItems}
        </div>
      </div>
    `.trim();
  };

  const copyRichTextToClipboard = async (type: 'email' | 'teams' | 'teams-text') => {
    let html = '';
    if (type === 'email') html = generateEmailHTML();
    else if (type === 'teams') html = generateTeamsHTML();
    else html = generateTeamsTextHTML();
    
    // Create a hidden div to hold the HTML for copying
    // This method is often more reliable for Outlook as it copies the "rendered" DOM
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.innerHTML = html;
    document.body.appendChild(container);

    try {
      // Use the modern Clipboard API with a fallback
      const blob = new Blob([html], { type: 'text/html' });
      const plainBlob = new Blob([generatePlainTextSummary()], { type: 'text/plain' });
      const data = [new ClipboardItem({ 
        'text/html': blob,
        'text/plain': plainBlob
      })];
      await navigator.clipboard.write(data);
      
      let copyType: 'rich' | 'teams-rich' | 'teams-text' = 'rich';
      if (type === 'email') copyType = 'rich';
      else if (type === 'teams') copyType = 'teams-rich';
      else copyType = 'teams-text';
      
      setCopiedType(copyType);
      setTimeout(() => setCopiedType(null), 2000);
    } catch (err) {
      console.error('Failed to copy rich text using Clipboard API:', err);
      // Fallback to manual selection and copy if Clipboard API fails
      try {
        const range = document.createRange();
        range.selectNodeContents(container);
        const selection = window.getSelection();
        if (selection) {
          selection.removeAllRanges();
          selection.addRange(range);
          document.execCommand('copy');
          selection.removeAllRanges();
          
          let copyType: 'rich' | 'teams-rich' | 'teams-text' = 'rich';
          if (type === 'email') copyType = 'rich';
          else if (type === 'teams') copyType = 'teams-rich';
          else copyType = 'teams-text';
          
          setCopiedType(copyType);
          setTimeout(() => setCopiedType(null), 2000);
        }
      } catch (fallbackErr) {
        console.error('Fallback copy failed:', fallbackErr);
        navigator.clipboard.writeText(html);
      }
    } finally {
      document.body.removeChild(container);
    }
  };

  const handleStatusChange = async (id: string, newStatus: Status) => {
    // Optimistic update
    setCommunities(prev => prev.map(c => 
      c.id === id ? { ...c, status: newStatus, isUpdated: true } : c
    ));

    try {
      await fetch('/api/communities/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus })
      });
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const resetUpdates = async () => {
    // Optimistic reset
    setCommunities(prev => prev.map(c => ({ ...c, isUpdated: false })));

    try {
      await fetch('/api/communities/reset', { method: 'POST' });
    } catch (err) {
      console.error('Failed to reset updates:', err);
    }
  };

  const generateEmailHTML = () => {
    const activeStatuses = Array.from(new Set(updatedCommunities.map(c => c.status)));
    
    const rows = updatedCommunities.map(c => `
      <tr>
        <td style="padding: 20px 12px; border-bottom: 1px solid #eeeeee; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size: 22px; font-weight: bold; color: #002244;" bgcolor="#ffffff">
          <strong>${c.name}</strong>
        </td>
        <td align="right" style="padding: 20px 12px; border-bottom: 1px solid #eeeeee; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;" bgcolor="#ffffff">
          <table border="0" cellspacing="0" cellpadding="0" style="border-collapse: collapse;">
            <tr>
              <td bgcolor="${STATUS_COLORS[c.status]}" style="background-color: ${STATUS_COLORS[c.status]} !important; padding: 10px 20px; border-radius: 8px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size: 16px; font-weight: bold; color: ${c.status === 'Yellow - High Volume' ? '#000000' : '#ffffff'} !important; text-transform: uppercase; white-space: nowrap;">
                <font color="${c.status === 'Yellow - High Volume' ? '#000000' : '#ffffff'}">
                  <span style="color: ${c.status === 'Yellow - High Volume' ? '#000000' : '#ffffff'} !important; font-weight: bold;">
                    ${c.status}
                  </span>
                </font>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    `).join('');

    const guidelines = activeStatuses.map(status => {
      let color = "#008A00";
      let bgColor = "#f0f9f0";
      let title = "🟢 GREEN: Maintain & Open";
      let text = "Operational stability allows for planned activities. Maintain all current Coachings and Team Meetings. Unplanned shrinkage is OPEN.";

      if (status === 'Yellow - High Volume') {
        color = "#856404";
        bgColor = "#fffdf0";
        title = "🟡 YELLOW: Monitor & Restrict";
        text = "Elevated volume. Maintain existing Coachings and Team Meetings only. Unplanned shrinkage is CLOSED. No additional off-phone activities.";
      } else if (status === 'Red - Critical') {
        color = "#D2122E";
        bgColor = "#fff5f5";
        title = "🔴 RED: Critical & Reschedule";
        text = "High-priority status. RESCHEDULE all planned Coachings and Team Meetings. Unplanned shrinkage is STRICTLY CLOSED. Cease all non-essential off-phone time.";
      }

      return `
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 15px; border-collapse: collapse;">
          <tr>
            <td bgcolor="${color}" width="4" style="width: 4px; font-size: 1px; background-color: ${color} !important;">&nbsp;</td>
            <td bgcolor="${bgColor}" style="background-color: ${bgColor} !important; padding: 15px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
              <strong style="color: ${color} !important; font-size: 14px; display: block; margin-bottom: 5px;"><font color="${color}"><span style="color: ${color} !important;">${title}</span></font></strong>
              <p style="margin: 0; font-size: 12px; color: #444444 !important; line-height: 1.5;">${text}</p>
            </td>
          </tr>
        </table>
      `;
    }).join('');

    return `
<table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#f4f4f4" style="background-color: #f4f4f4; border-collapse: collapse; width: 100% !important;">
  <tr>
    <td align="center" style="padding: 40px 10px;">
      <table width="600" border="0" cellspacing="0" cellpadding="0" bgcolor="#ffffff" style="width: 600px !important; min-width: 600px !important; max-width: 600px !important; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; border-collapse: collapse; background-color: #ffffff; table-layout: fixed;" align="center">
        <!-- Header -->
        <tr>
            <td align="center" bgcolor="#B3D4FF" width="600" style="background-color: #B3D4FF !important; padding: 40px 20px; mso-line-height-rule: exactly; width: 600px !important;">
              <table border="0" cellspacing="0" cellpadding="0" align="center" style="border-collapse: collapse;">
                <tr>
                  <td align="center" width="220">
                    <img src="${EMAIL_LOGO_URL}" alt="Disney Central" width="220" border="0" style="display: block; width: 220px; height: auto; border: 0; -ms-interpolation-mode: bicubic;" />
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-top: 20px; color: #002244 !important; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
                    <h1 style="margin: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size: 28px; font-weight: bold; color: #002244 !important; line-height: 1.2; text-decoration: none;">
                      <font color="#002244" style="color: #002244 !important;">
                        <span style="color: #002244 !important; font-size: 28px !important; line-height: 34px !important; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
                          Disney Central Phase Alert Update
                        </span>
                      </font>
                    </h1>
                  </td>
                </tr>
              </table>
            </td>
        </tr>
        <!-- Content -->
        <tr>
          <td width="600" bgcolor="#ffffff" style="padding: 30px 25px; background-color: #ffffff !important; width: 600px !important;">
            <p style="margin: 0 0 20px 0; color: #333333 !important; font-size: 15px; line-height: 1.5; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">The following communities have updated operational statuses:</p>
            
            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 30px; border-collapse: collapse;">
              ${rows}
            </table>
            
            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="border-top: 1px solid #eeeeee; border-collapse: collapse;">
              <tr>
                <td style="padding-top: 25px;" bgcolor="#ffffff" style="background-color: #ffffff !important;">
                  <h3 style="color: #002244 !important; font-size: 16px; font-weight: bold; margin: 0 0 15px 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">⚠️ Phase Guidelines</h3>
                  ${guidelines}
                </td>
              </tr>
            </table>

            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="border-top: 1px solid #eeeeee; margin-top: 30px; border-collapse: collapse;">
              <tr>
                <td align="center" style="padding-top: 20px; color: #888888 !important; font-size: 11px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;" bgcolor="#ffffff" style="background-color: #ffffff !important;">
                  This is an automated operational alert from the Disney Central Phase Alert Hub.
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`.trim();
  };

  const generateTeamsHTML = () => {
    const priority = getHighestPriority();
    const bgColor = {
      'Green - Normal': '#DFF6DD',
      'Yellow - High Volume': '#FFF4CE',
      'Red - Critical': '#FDE7E9',
    };
    const textColor = {
      'Green - Normal': '#107C10',
      'Yellow - High Volume': '#797775',
      'Red - Critical': '#A80000',
    };

    const rows = updatedCommunities.map(c => {
      const statusColorMap: Record<string, string> = {
        'Green - Normal': '#008A00',
        'Yellow - High Volume': '#FFCC00',
        'Red - Critical': '#D2122E',
      };
      const statusColor = statusColorMap[c.status];

      return `
        <div style="display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 14px;">
          <div style="color: #002244 !important; font-weight: 700;">${c.name}</div>
          <div style="color: ${statusColor} !important; font-weight: 700;">${c.status}</div>
        </div>
      `;
    }).join('');

    const activeStatuses = Array.from(new Set(updatedCommunities.map(c => c.status))) as Status[];
    const guidelineItems = activeStatuses.map(status => {
      const colorMap: Record<string, string> = {
        'Green - Normal': '#008A00',
        'Yellow - High Volume': '#856404',
        'Red - Critical': '#D2122E',
      };
      const color = colorMap[status];

      let text = "";
      if (status === 'Green - Normal') text = "🟢 GREEN: Maintain & Open. Unplanned shrinkage is OPEN.";
      else if (status === 'Yellow - High Volume') text = "🟡 YELLOW: Monitor & Restrict. Unplanned shrinkage is CLOSED.";
      else if (status === 'Red - Critical') text = "🔴 RED: Critical & Reschedule. Unplanned shrinkage is STRICTLY CLOSED.";
      
      return `<div style="font-size: 10px; color: ${color} !important; margin-bottom: 4px; line-height: 1.2; font-weight: 600;">${text}</div>`;
    }).join('');

    return `
      <div style="background-color: #ffffff; border: 1px solid #E1DFDD; border-radius: 4px; max-width: 400px; font-family: 'Segoe UI', system-ui, sans-serif; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
        <div style="padding: 12px; background-color: ${bgColor[priority]}; color: ${textColor[priority]}; border-bottom: 1px solid #EDEBE9; display: flex; align-items: center; gap: 10px;">
          <div style="background-color: #ffffff; padding: 4px; border-radius: 2px; display: flex; align-items: center;">
            <img src="${LOGO_URL}" alt="Logo" width="24" height="24" style="width: 24px; height: 24px;" />
          </div>
          <div style="font-size: 14px; font-weight: bold;">Disney Central Phase Alert Update</div>
        </div>
        <div style="padding: 16px;">
          ${rows}
          <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #EDEBE9;">
            <div style="font-size: 10px; font-weight: bold; color: #605E5C; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">Phase Guidelines</div>
            ${guidelineItems}
          </div>
        </div>
      </div>
    `.trim();
  };

  const getHighestPriority = () => {
    if (updatedCommunities.some(c => c.status === 'Red - Critical')) return 'Red - Critical';
    if (updatedCommunities.some(c => c.status === 'Yellow - High Volume')) return 'Yellow - High Volume';
    return 'Green - Normal';
  };

  const generateTeamsJSON = () => {
    const highestPriority = getHighestPriority();
    
    // Create a custom layout for communities instead of FactSet to allow for coloring and bolding
    const communityItems = updatedCommunities.map(c => {
      let color: "Good" | "Warning" | "Attention" | "Default" = "Default";
      if (c.status === 'Green - Normal') color = "Good";
      else if (c.status === 'Yellow - High Volume') color = "Warning";
      else if (c.status === 'Red - Critical') color = "Attention";

      return {
        "type": "ColumnSet",
        "spacing": "Small",
        "columns": [
          {
            "type": "Column",
            "width": "stretch",
            "items": [
              {
                "type": "TextBlock",
                "text": `**${c.name}**`,
                "wrap": true
              }
            ]
          },
          {
            "type": "Column",
            "width": "auto",
            "items": [
              {
                "type": "TextBlock",
                "text": c.status,
                "color": color,
                "weight": "Bolder",
                "wrap": true
              }
            ]
          }
        ]
      };
    });

    const activeStatuses = Array.from(new Set(updatedCommunities.map(c => c.status))) as Status[];
    const guidelineItems = activeStatuses.map(status => {
      let text = "";
      let color: "Good" | "Warning" | "Attention" | "Default" = "Default";
      if (status === 'Green - Normal') {
        text = "🟢 GREEN: Maintain & Open. Unplanned shrinkage is OPEN.";
        color = "Good";
      } else if (status === 'Yellow - High Volume') {
        text = "🟡 YELLOW: Monitor & Restrict. Unplanned shrinkage is CLOSED.";
        color = "Warning";
      } else if (status === 'Red - Critical') {
        text = "🔴 RED: Critical & Reschedule. Unplanned shrinkage is STRICTLY CLOSED.";
        color = "Attention";
      }
      return {
        "type": "TextBlock",
        "text": text,
        "wrap": true,
        "size": "Small",
        "color": color,
        "weight": "Bolder"
      };
    });

    return JSON.stringify({
      "type": "AdaptiveCard",
      "version": "1.4",
      "body": [
        {
          "type": "Container",
          "style": highestPriority === 'Red - Critical' ? "attention" : highestPriority === 'Yellow - High Volume' ? "warning" : "good",
          "bleed": true,
          "items": [
            {
              "type": "TextBlock",
              "text": "Disney Central Phase Alert Update",
              "weight": "Bolder",
              "size": "Large",
              "color": "Default"
            }
          ]
        },
        {
          "type": "Container",
          "spacing": "Medium",
          "items": communityItems
        },
        {
          "type": "Container",
          "separator": true,
          "items": [
            {
              "type": "TextBlock",
              "text": "Phase Guidelines",
              "weight": "Bolder",
              "size": "Small",
              "spacing": "Medium"
            },
            ...guidelineItems
          ]
        }
      ],
      "$schema": "http://adaptivecards.io/schemas/adaptive-card.json"
    }, null, 2);
  };

  const copyToClipboard = (text: string, type: 'email' | 'teams') => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const userName = USER_REGISTRY[idInput];
    if (userName) {
      const userData = { id: idInput, name: userName };
      setUser(userData);
      localStorage.setItem('dc_user', JSON.stringify(userData));
      setLoginError(false);
    } else {
      setLoginError(true);
      setIdInput('');
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('dc_user');
    setIdInput('');
  };

  if (view === 'tv') {
    return <TVDashboard communities={communities} isLoading={isLoading} fetchError={fetchError} />;
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#002244] flex items-center justify-center p-4 font-sans">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md text-center"
        >
          <img src={LOGO_URL} alt="Disney Central" className="h-16 mx-auto mb-8 object-contain" />
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-[#002244] mb-2">Access Required</h2>
            <p className="text-slate-500 text-sm">Please enter your ID number to access the Phase Alert Hub.</p>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input 
                type="password"
                value={idInput}
                onChange={(e) => setIdInput(e.target.value)}
                placeholder="Enter ID Number"
                className={`w-full pl-10 pr-4 py-3 bg-slate-50 border ${loginError ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-200'} rounded-xl focus:outline-none focus:ring-2 focus:ring-[#002244] transition-all`}
                autoFocus
              />
            </div>
            {loginError && (
              <p className="text-red-500 text-xs font-bold">Invalid ID number. Please try again.</p>
            )}
            <button 
              type="submit"
              className="w-full bg-[#002244] hover:bg-[#003366] text-white py-3 rounded-xl font-bold transition-all active:scale-[0.98] shadow-lg shadow-blue-900/20"
            >
              Access Hub
            </button>
          </form>
          
          <p className="mt-8 text-[10px] text-slate-400 uppercase tracking-widest font-medium">
            Authorized Personnel Only
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-[#002244] text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-white p-1 rounded-md shadow-sm">
              <img src={LOGO_URL} alt="Disney Central Logo" className="h-10 w-auto object-contain" />
            </div>
            <div className="h-8 w-[1px] bg-white/20" />
            <h1 className="text-xl font-bold tracking-tight">Phase Alert Hub</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex flex-col items-end mr-2">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Welcome</span>
              <span className="text-sm font-bold text-white">{user.name}</span>
            </div>
            <div className="h-8 w-[1px] bg-white/20 hidden md:block" />
            <div className="flex items-center gap-2">
              <a 
                href="/tv" 
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg transition-colors text-xs font-bold mr-2 border border-white/10"
                title="Open TV Monitor"
              >
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                Monitor Mode
              </a>
              <button 
                onClick={resetUpdates}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
                title="Reset all updates"
              >
                <RefreshCcw className="w-5 h-5" />
              </button>
              <button 
                onClick={handleLogout}
                className="p-2 hover:bg-white/10 rounded-full transition-colors text-red-400"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 pb-32">
        {fetchError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between text-red-800">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <div>
                <p className="font-bold text-sm">Connection Error</p>
                <p className="text-xs opacity-80">{fetchError}</p>
              </div>
            </div>
            <button 
              onClick={() => window.location.reload()}
              className="px-3 py-1 bg-red-100 hover:bg-red-200 rounded-lg text-xs font-bold transition-colors"
            >
              Reconnect
            </button>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#002244]"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {communities.map((community: Community) => (
              <CommunityCard 
                key={community.id} 
                community={community} 
                onStatusChange={handleStatusChange} 
              />
            ))}
          </div>
        )}
      </main>

      {/* Staging Area / Tray */}
      <AnimatePresence>
        {updatedCommunities.length > 0 && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 shadow-[0_-8px_30px_rgb(0,0,0,0.12)] p-4"
          >
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4 overflow-x-auto pb-2 md:pb-0 w-full md:w-auto">
                <div className="flex-shrink-0 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm font-bold border border-blue-100">
                  {updatedCommunities.length} {updatedCommunities.length === 1 ? 'Community' : 'Communities'} Updated
                </div>
                <div className="flex gap-2">
                  {updatedCommunities.map(c => (
                    <div 
                      key={c.id}
                      className="flex-shrink-0 px-3 py-1 bg-slate-100 rounded-md text-xs font-medium flex items-center gap-2 border border-slate-200"
                    >
                      <StatusIcon status={c.status} size={12} />
                      {c.name}
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-3 w-full md:w-auto">
                <button 
                  onClick={() => setShowModal(true)}
                  className="flex-1 md:flex-none bg-[#002244] hover:bg-[#003366] text-white px-8 py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-blue-900/20"
                >
                  <Send className="w-5 h-5" />
                  Review & Send
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Output Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[95vh] overflow-hidden flex flex-col"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div>
                  <h2 className="text-2xl font-bold text-[#002244]">Review & Distribute</h2>
                  <p className="text-slate-500 text-sm">Generated alert content for Email and Microsoft Teams (Card & Text)</p>
                </div>
                <button 
                  onClick={() => setShowModal(false)}
                  className="p-2 hover:bg-slate-200 rounded-full transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-10">
                {/* Email Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold text-slate-700">
                      <Mail className="w-5 h-5 text-blue-600" />
                      Email Template
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={handleSendOutlook}
                        className="text-xs flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white hover:bg-blue-700 rounded-md font-bold transition-colors shadow-sm"
                      >
                        {copiedType === 'rich' ? <Check className="w-3.5 h-3.5" /> : <Mail className="w-3.5 h-3.5" />}
                        {copiedType === 'rich' ? 'Copied!' : 'Copy & Open Outlook'}
                      </button>
                    </div>
                  </div>
                  <div className="bg-slate-50 rounded-xl border border-slate-200 h-[500px] overflow-hidden flex flex-col">
                    <div className="p-3 bg-white border-b border-slate-100 text-[10px] text-slate-400 font-mono uppercase tracking-wider">
                      Preview
                    </div>
                    <div className="flex-1 overflow-auto p-4 bg-white">
                      <div dangerouslySetInnerHTML={{ __html: generateEmailHTML() }} />
                    </div>
                  </div>
                </div>

                {/* Teams Card Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold text-slate-700">
                      <MessageSquare className="w-5 h-5 text-purple-600" />
                      Teams Card
                    </div>
                    <div className="text-xs font-medium text-slate-500 italic bg-slate-100 px-3 py-1.5 rounded-md border border-slate-200">
                      Use snipping tool, and copy-paste image on the Disney Central Operational Chat
                    </div>
                  </div>
                  <div className="bg-slate-50 rounded-xl border border-slate-200 h-[500px] overflow-hidden flex flex-col">
                    <div className="p-3 bg-white border-b border-slate-100 text-[10px] text-slate-400 font-mono uppercase tracking-wider">
                      Preview
                    </div>
                    <div className="flex-1 overflow-auto p-6 bg-[#F3F2F1]">
                      <TeamsCardPreview 
                        communities={updatedCommunities} 
                        priority={getHighestPriority()} 
                      />
                    </div>
                  </div>
                </div>

                {/* Teams Text Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold text-slate-700">
                      <MessageSquare className="w-5 h-5 text-indigo-600" />
                      Teams Text Update
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => copyRichTextToClipboard('teams-text')}
                        className="text-xs flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white hover:bg-indigo-700 rounded-md font-bold transition-colors shadow-sm"
                      >
                        {copiedType === 'teams-text' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        {copiedType === 'teams-text' ? 'Copied!' : 'Copy Text'}
                      </button>
                    </div>
                  </div>
                  <div className="bg-slate-50 rounded-xl border border-slate-200 h-[500px] overflow-hidden flex flex-col">
                    <div className="p-3 bg-white border-b border-slate-100 text-[10px] text-slate-400 font-mono uppercase tracking-wider">
                      Preview
                    </div>
                    <div className="flex-1 overflow-auto p-6 bg-white">
                      <div dangerouslySetInnerHTML={{ __html: generateTeamsTextHTML() }} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                <button 
                  onClick={() => setShowModal(false)}
                  className="px-6 py-2 rounded-lg font-bold text-slate-600 hover:bg-slate-200 transition-colors"
                >
                  Close
                </button>
                <button 
                  onClick={() => {
                    resetUpdates();
                    setShowModal(false);
                  }}
                  className="px-6 py-2 rounded-lg font-bold bg-[#002244] text-white hover:bg-[#003366] transition-colors"
                >
                  Mark as Sent
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface CommunityCardProps {
  community: Community;
  onStatusChange: (id: string, status: Status) => void;
}

const CommunityCard: React.FC<CommunityCardProps> = ({ community, onStatusChange }) => {
  const statusGlow = {
    'Green - Normal': 'shadow-[0_0_15px_rgba(0,138,0,0.1)]',
    'Yellow - High Volume': 'shadow-[0_0_15px_rgba(255,204,0,0.15)]',
    'Red - Critical': 'shadow-[0_0_15px_rgba(210,18,46,0.2)]',
  };

  const accentBorder = {
    'Green - Normal': 'border-l-4 border-l-[#008A00]',
    'Yellow - High Volume': 'border-l-4 border-l-[#FFCC00]',
    'Red - Critical': 'border-l-4 border-l-[#D2122E]',
  };

  return (
    <motion.div 
      layout
      className={`bg-white rounded-xl p-5 border border-slate-200 transition-all duration-300 ${statusGlow[community.status]} ${accentBorder[community.status]} ${community.isUpdated ? 'ring-2 ring-blue-400 ring-offset-2' : ''}`}
    >
      <div className="flex justify-between items-start mb-4">
        <h3 className="font-bold text-slate-800 leading-tight">{community.name}</h3>
        {community.isUpdated && (
          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
            Updated
          </span>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-500 mb-1">
          <StatusIcon status={community.status} size={16} />
          <span style={{ color: STATUS_COLORS[community.status] }}>{community.status}</span>
        </div>

        <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-lg">
          {(['Green - Normal', 'Yellow - High Volume', 'Red - Critical'] as Status[]).map((s) => (
            <button
              key={s}
              onClick={() => onStatusChange(community.id, s)}
              className={`py-1.5 rounded-md text-[10px] font-bold transition-all ${
                community.status === s 
                  ? 'bg-white shadow-sm scale-105 z-10' 
                  : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200/50'
              }`}
              style={community.status === s ? { color: STATUS_COLORS[s] } : {}}
            >
              {s === 'Green - Normal' ? 'NORM' : s === 'Yellow - High Volume' ? 'HIGH' : 'CRIT'}
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

const StatusIcon: React.FC<{ status: Status, size?: number }> = ({ status, size = 20 }) => {
  switch (status) {
    case 'Green - Normal': return <CheckCircle2 size={size} className="text-[#008A00]" />;
    case 'Yellow - High Volume': return <AlertTriangle size={size} className="text-[#FFCC00]" />;
    case 'Red - Critical': return <AlertCircle size={size} className="text-[#D2122E]" />;
  }
}

const TVDashboard: React.FC<{ communities: Community[], isLoading: boolean, fetchError: string | null }> = ({ communities, isLoading, fetchError }) => {
  return (
    <div className="h-screen bg-[#001122] text-white p-4 flex flex-col font-sans overflow-hidden">
      <header className="flex items-center justify-between mb-4 border-b border-white/10 pb-4">
        <div className="flex items-center gap-4">
          <div className="bg-white p-1.5 rounded-lg shadow-xl">
            <img src={LOGO_URL} alt="Logo" className="h-10 w-auto" />
          </div>
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tighter text-white leading-none">Live Phase Monitor</h1>
            <p className="text-blue-300 font-bold flex items-center gap-2 text-[10px] mt-1">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              REAL-TIME OPERATIONAL STATUS
              {fetchError && <span className="text-red-500 ml-2 uppercase tracking-widest animate-pulse">!! Connection Lost !!</span>}
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-4xl font-mono font-bold tracking-tight text-white/90 leading-none">
            {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
          <div className="text-blue-300 font-bold uppercase tracking-widest text-[9px] mt-1">
            {new Date().toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
          </div>
        </div>
      </header>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-500"></div>
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-3 flex-1 overflow-hidden">
          {communities.map((c) => (
            <motion.div 
              layout
              key={c.id}
              className={`rounded-xl p-4 border-2 transition-all duration-500 flex flex-col justify-between group ${
                c.status === 'Red - Critical' 
                  ? 'bg-red-950/40 border-red-500/50 shadow-[0_0_20px_rgba(210,18,46,0.2)]' 
                  : c.status === 'Yellow - High Volume'
                  ? 'bg-yellow-950/30 border-yellow-500/50 shadow-[0_0_20px_rgba(255,204,0,0.15)]'
                  : 'bg-green-950/20 border-green-500/30'
              }`}
            >
              <div>
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-xl font-black tracking-tight leading-none group-hover:scale-105 transition-transform origin-left">{c.name}</h3>
                  <div className={`p-1.5 rounded-full ${
                    c.status === 'Red - Critical' ? 'bg-red-500' : 
                    c.status === 'Yellow - High Volume' ? 'bg-yellow-500 text-black' : 'bg-green-500'
                  }`}>
                    <StatusIcon status={c.status} size={18} />
                  </div>
                </div>
              </div>
              
              <div className="mt-auto">
                <div className={`text-[8px] font-black uppercase tracking-[0.2em] mb-0.5 ${
                  c.status === 'Red - Critical' ? 'text-red-400' : 
                  c.status === 'Yellow - High Volume' ? 'text-yellow-400' : 'text-green-400'
                }`}>
                  Current Phase
                </div>
                <div className={`text-lg font-bold tracking-tight leading-none ${
                  c.status === 'Red - Critical' ? 'text-red-200' : 
                  c.status === 'Yellow - High Volume' ? 'text-yellow-100' : 'text-green-200'
                }`}>
                  {c.status.toUpperCase()}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <footer className="mt-4 pt-4 border-t border-white/10 flex justify-between items-center text-[9px] font-bold tracking-widest text-white/30 uppercase">
        <div>DISNEY CENTRAL PHASE ALERT HUB • INTERNAL MONITOR</div>
        <div className="flex gap-4">
          <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-green-500"></div> NORMAL</div>
          <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-yellow-500"></div> HIGH VOLUME</div>
          <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-red-500"></div> CRITICAL</div>
        </div>
      </footer>
    </div>
  );
};

const TeamsCardPreview: React.FC<{ communities: Community[], priority: Status }> = ({ communities, priority }) => {
  const bgColor = {
    'Green - Normal': 'bg-[#DFF6DD]',
    'Yellow - High Volume': 'bg-[#FFF4CE]',
    'Red - Critical': 'bg-[#FDE7E9]',
  };

  const textColor = {
    'Green - Normal': 'text-[#107C10]',
    'Yellow - High Volume': 'text-[#797775]',
    'Red - Critical': 'text-[#A80000]',
  };

  const activeStatuses = Array.from(new Set(communities.map(c => c.status)));

  return (
    <div className="bg-white rounded shadow-sm border border-[#E1DFDD] max-w-[350px] mx-auto overflow-hidden font-sans">
      <div className={`p-3 ${bgColor[priority]} ${textColor[priority]} border-b border-[#EDEBE9] flex items-center gap-3`}>
        <div className="bg-white p-1 rounded-sm">
          <img src={LOGO_URL} alt="Logo" className="h-6 w-auto" />
        </div>
        <div className="text-sm font-bold">Disney Central Phase Alert Update</div>
      </div>
      <div className="p-4 space-y-3">
        {communities.map((c) => (
          <div key={c.id} className="grid grid-cols-2 gap-4 text-[12px]">
            <div className="text-[#605E5C] font-semibold">{c.name}</div>
            <div className="text-[#323130]">{c.status}</div>
          </div>
        ))}
        
        <div className="pt-3 border-t border-[#EDEBE9] space-y-2">
          <div className="text-[10px] font-bold text-[#605E5C] uppercase tracking-wider">Phase Guidelines</div>
          {activeStatuses.map(status => {
            let text = "";
            if (status === 'Green - Normal') text = "🟢 GREEN: Maintain & Open. Unplanned shrinkage is OPEN.";
            else if (status === 'Yellow - High Volume') text = "🟡 YELLOW: Monitor & Restrict. Unplanned shrinkage is CLOSED.";
            else if (status === 'Red - Critical') text = "🔴 RED: Critical & Reschedule. Unplanned shrinkage is STRICTLY CLOSED.";
            
            return (
              <div key={status} className="text-[10px] text-[#605E5C] leading-tight">
                {text}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

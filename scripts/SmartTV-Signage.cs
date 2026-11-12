using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Net;
using System.Net.Sockets;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Threading;
using System.Windows.Forms;
using Microsoft.Win32;

[assembly: AssemblyTitle("Smart TV Multi-Channel LAN Signage")]
[assembly: AssemblyDescription("Standalone Production Launcher for Smart TV Signage")]
[assembly: AssemblyCompany("mamabuncho")]
[assembly: AssemblyProduct("Smart TV Signage")]
[assembly: AssemblyCopyright("Copyright © 2026 mamabuncho. All rights reserved.")]
[assembly: AssemblyFileVersion("1.2.0.0")]
[assembly: AssemblyVersion("1.2.0.0")]

namespace SmartTVSignage
{
    public class Program
    {
        private static NotifyIcon trayIcon;
        private static Process nodeProcess;
        private static Mutex singleInstanceMutex;
        private static string appDir;
        private static string localLanIp = "localhost";
        private const int Port = 8080;
        private const string AppName = "SmartTV-Signage";
        private const string StartupRegKey = @"Software\Microsoft\Windows\CurrentVersion\Run";

        [STAThread]
        public static void Main(string[] args)
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);

            // Single instance lock
            bool createdNew;
            singleInstanceMutex = new Mutex(true, "SmartTVSignageSingleInstanceMutex", out createdNew);
            if (!createdNew)
            {
                // Already running, just open browser to admin dashboard
                OpenUrl("http://localhost:" + Port + "/admin");
                return;
            }

            // Determine application directory
            appDir = Path.GetDirectoryName(Assembly.GetExecutingAssembly().Location);
            Directory.SetCurrentDirectory(appDir);

            // Detect LAN IP
            DetectLocalLanIp();

            // Clean any stale process holding port 8080
            KillProcessOnPort(Port);

            // Start Node.js server in hidden background process
            StartNodeServer();

            // Setup System Tray Icon & Context Menu
            SetupTrayIcon();

            // Auto-open Admin Dashboard in default browser after 1.5 seconds
            var timer = new System.Windows.Forms.Timer { Interval = 1500 };
            timer.Tick += (s, e) =>
            {
                timer.Stop();
                timer.Dispose();
                OpenUrl("http://localhost:" + Port + "/admin");
            };
            timer.Start();

            // Run Windows message loop
            Application.Run();
        }

        private static void DetectLocalLanIp()
        {
            try
            {
                var host = Dns.GetHostEntry(Dns.GetHostName());
                foreach (var ip in host.AddressList)
                {
                    if (ip.AddressFamily == AddressFamily.InterNetwork &&
                        !IPAddress.IsLoopback(ip) &&
                        !ip.ToString().StartsWith("169.254."))
                    {
                        localLanIp = ip.ToString();
                        break;
                    }
                }
            }
            catch
            {
                localLanIp = "localhost";
            }
        }

        private static void StartNodeServer()
        {
            try
            {
                var nodeExecutable = "node.exe";
                var localNode = Path.Combine(appDir, "node.exe");
                var binNode = Path.Combine(appDir, "bin", "node.exe");
                if (File.Exists(localNode))
                {
                    nodeExecutable = localNode;
                }
                else if (File.Exists(binNode))
                {
                    nodeExecutable = binNode;
                }

                var startInfo = new ProcessStartInfo
                {
                    FileName = nodeExecutable,
                    Arguments = "--max-old-space-size=256 src/server.js",
                    WorkingDirectory = appDir,
                    WindowStyle = ProcessWindowStyle.Hidden,
                    CreateNoWindow = true,
                    UseShellExecute = false
                };

                nodeProcess = Process.Start(startInfo);
            }
            catch (Exception ex)
            {
                MessageBox.Show(
                    "ไม่พบโปรแกรม Node.js ในเครื่อง หรือไม่สามารถเริ่มเซิร์ฟเวอร์ได้:\n" + ex.Message +
                    "\n\nกรุณาติดตั้ง Node.js จาก https://nodejs.org แล้วลองใหม่อีกครั้ง",
                    "Smart TV Signage Error",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error);
                Environment.Exit(1);
            }
        }

        private static void SetupTrayIcon()
        {
            var contextMenu = new ContextMenuStrip();

            var headerItem = new ToolStripMenuItem("📺 Smart TV Signage (พอร์ต " + Port + ")")
            {
                Font = new Font(Control.DefaultFont, FontStyle.Bold),
                Enabled = false
            };
            contextMenu.Items.Add(headerItem);
            contextMenu.Items.Add(new ToolStripSeparator());

            var adminItem = new ToolStripMenuItem("💻 เปิดหน้าควบคุม (Admin Dashboard)", null, (s, e) =>
            {
                OpenUrl("http://localhost:" + Port + "/admin");
            });
            contextMenu.Items.Add(adminItem);

            var tvItem = new ToolStripMenuItem("📺 เปิดหน้าจอทีวีช่อง 1 (TV View)", null, (s, e) =>
            {
                OpenUrl("http://localhost:" + Port + "/tv/1");
            });
            contextMenu.Items.Add(tvItem);

            var copyIpItem = new ToolStripMenuItem("📋 คัดลอกลิงก์ Smart TV (วง LAN)", null, (s, e) =>
            {
                var url = "http://" + localLanIp + ":" + Port + "/tv/1";
                Clipboard.SetText(url);
                trayIcon.ShowBalloonTip(3000, "คัดลอกลิงก์สำเร็จ", "คัดลอก " + url + " ลงในคลิปบอร์ดแล้ว นำไปเปิดบนทีวีได้ทันที", ToolTipIcon.Info);
            });
            contextMenu.Items.Add(copyIpItem);

            contextMenu.Items.Add(new ToolStripSeparator());

            // Auto-start with Windows toggle
            var autoStartItem = new ToolStripMenuItem("⚡ เริ่มทำงานอัตโนมัติเมื่อเปิดเครื่อง (Auto-Start)")
            {
                CheckOnClick = true,
                Checked = IsAutoStartEnabled()
            };
            autoStartItem.CheckedChanged += (s, e) =>
            {
                SetAutoStart(autoStartItem.Checked);
            };
            contextMenu.Items.Add(autoStartItem);

            contextMenu.Items.Add(new ToolStripSeparator());

            var exitItem = new ToolStripMenuItem("❌ ปิดโปรแกรม (Exit)", null, (s, e) =>
            {
                ExitApplication();
            });
            contextMenu.Items.Add(exitItem);

            // Load application icon
            Icon appIcon = null;
            var iconPath = Path.Combine(appDir, "app.ico");
            if (File.Exists(iconPath))
            {
                try
                {
                    appIcon = new Icon(iconPath);
                }
                catch {}
            }
            if (appIcon == null)
            {
                appIcon = SystemIcons.Application;
            }

            trayIcon = new NotifyIcon
            {
                Icon = appIcon,
                ContextMenuStrip = contextMenu,
                Text = "Smart TV LAN Signage System",
                Visible = true
            };

            trayIcon.DoubleClick += (s, e) =>
            {
                OpenUrl("http://localhost:" + Port + "/admin");
            };

            // Initial startup balloon tip
            trayIcon.ShowBalloonTip(
                3500,
                "Smart TV Signage พร้อมใช้งาน",
                "ระบบกำลังทำงานในพื้นหลัง (http://" + localLanIp + ":" + Port + ")\nดับเบิ้ลคลิกเพื่อเปิดหน้าควบคุม",
                ToolTipIcon.Info);
        }

        private static bool IsAutoStartEnabled()
        {
            try
            {
                using (var key = Registry.CurrentUser.OpenSubKey(StartupRegKey, false))
                {
                    return key != null && key.GetValue(AppName) != null;
                }
            }
            catch
            {
                return false;
            }
        }

        private static void SetAutoStart(bool enable)
        {
            try
            {
                using (var key = Registry.CurrentUser.OpenSubKey(StartupRegKey, true))
                {
                    if (key != null)
                    {
                        if (enable)
                        {
                            var exePath = Assembly.GetExecutingAssembly().Location;
                            key.SetValue(AppName, "\"" + exePath + "\"");
                        }
                        else
                        {
                            key.DeleteValue(AppName, false);
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show("ไม่สามารถตั้งค่า Auto-Start ได้: " + ex.Message, "Warning", MessageBoxButtons.OK, MessageBoxIcon.Warning);
            }
        }

        private static void OpenUrl(string url)
        {
            try
            {
                Process.Start(new ProcessStartInfo(url) { UseShellExecute = true });
            }
            catch (Exception ex)
            {
                Debug.WriteLine("Failed to open URL: " + ex.Message);
            }
        }

        private static void KillProcessOnPort(int port)
        {
            try
            {
                var netstat = new ProcessStartInfo
                {
                    FileName = "cmd.exe",
                    Arguments = "/c \"for /f \"tokens=5\" %a in ('netstat -aon ^| findstr :" + port + " ^| findstr LISTENING') do taskkill /F /PID %a\"",
                    WindowStyle = ProcessWindowStyle.Hidden,
                    CreateNoWindow = true
                };
                using (var p = Process.Start(netstat))
                {
                    if (p != null)
                    {
                        p.WaitForExit(3000);
                    }
                }
            }
            catch {}
        }

        private static void ExitApplication()
        {
            try
            {
                if (trayIcon != null)
                {
                    trayIcon.Visible = false;
                    trayIcon.Dispose();
                }

                if (nodeProcess != null && !nodeProcess.HasExited)
                {
                    nodeProcess.Kill();
                    nodeProcess.WaitForExit(2000);
                }
                KillProcessOnPort(Port);
            }
            catch {}
            finally
            {
                if (singleInstanceMutex != null)
                {
                    try { singleInstanceMutex.ReleaseMutex(); } catch {}
                }
                Environment.Exit(0);
            }
        }
    }
}

param([string]$WindowHandle)
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class Desktop {
 [DllImport("user32.dll", SetLastError=true)] public static extern IntPtr FindWindow(string c,string n);
 [DllImport("user32.dll", SetLastError=true)] public static extern IntPtr FindWindowEx(IntPtr p,IntPtr c,string cls,string n);
 [DllImport("user32.dll", SetLastError=true)] public static extern IntPtr SendMessageTimeout(IntPtr h,uint m,IntPtr w,IntPtr l,uint f,uint t,out IntPtr r);
 [DllImport("user32.dll", SetLastError=true)] public static extern IntPtr SetParent(IntPtr child,IntPtr parent);
 [DllImport("user32.dll")] public static extern bool EnumWindows(EnumProc p,IntPtr l);
 public delegate bool EnumProc(IntPtr h,IntPtr l);
}
"@
$progman=[Desktop]::FindWindow("Progman",$null)
$result=[IntPtr]::Zero
[Desktop]::SendMessageTimeout($progman,0x052C,[IntPtr]::Zero,[IntPtr]::Zero,0,1000,[ref]$result) | Out-Null
$script:worker=[IntPtr]::Zero
[Desktop]::EnumWindows({param($top,$l) $view=[Desktop]::FindWindowEx($top,[IntPtr]::Zero,"SHELLDLL_DefView",$null); if($view -ne [IntPtr]::Zero){$script:worker=[Desktop]::FindWindowEx([IntPtr]::Zero,$top,"WorkerW",$null)}; return $true},[IntPtr]::Zero) | Out-Null
if($script:worker -eq [IntPtr]::Zero){$script:worker=$progman}
[Desktop]::SetParent([IntPtr]::new([long]$WindowHandle),$script:worker) | Out-Null

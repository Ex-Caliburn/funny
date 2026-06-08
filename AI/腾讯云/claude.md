# Claude

## 前言

官方Claude 要订阅

### 永远运行

重启后仍保持守护进程运行
如果您希望守护进程在重启后自动恢复（无需happy先打开会话），请从您的 shell 配置文件启动它，以便它继承您的普通用户会话上下文（PATH、钥匙串访问、OAuth 凭据）：

```shell
# ~/.zshrc or ~/.bashrc
if [[ -o interactive ]] && [[ -z "$HAPPY_DAEMON_CHECKED" ]]; then
    export HAPPY_DAEMON_CHECKED=1
    () {
        local state=$HOME/.happy/daemon.state.json
        local pid=$(grep -oE '"pid"[[:space:]]*:[[:space:]]*[0-9]+' "$state" 2>/dev/null | grep -oE '[0-9]+')
        if [[ -z "$pid" ]] || ! kill -0 "$pid" 2>/dev/null; then
            happy daemon start >/dev/null 2>&1
        fi
    } &!
fi
```

光这个还不行，shell rc 只在交互式登录时执行，重启后没人登录 root，脚本永远不跑

确的方案是 systemd 服务——自动在系统启动时运行，不依赖登录

```shell
#!/bin/bash
# Wrapper to start happy daemon and extract PID for systemd
set -e

PIDFILE=/run/happy-daemon.pid
STATE=/root/.happy/daemon.state.json

# Clean up: kill old daemon
old_pid=$(jq -r '.pid // empty' "$STATE" 2>/dev/null)
if [[ -n "$old_pid" ]] && kill -0 "$old_pid" 2>/dev/null; then
  kill "$old_pid" 2>/dev/null || true
  # Wait for it to die
  for i in $(seq 1 20); do
    kill -0 "$old_pid" 2>/dev/null || break
    sleep 0.25
  done
  # Force kill if still alive
  kill -9 "$old_pid" 2>/dev/null || true
fi

rm -f /root/.happy/daemon.lock "$PIDFILE"

# Start daemon (detached)
/root/.nvm/versions/node/v22.22.1/bin/happy daemon start

# Wait for PID to appear
for i in $(seq 1 60); do
  pid=$(jq -r '.pid // empty' "$STATE" 2>/dev/null)
  if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
    echo "$pid" > "$PIDFILE"
    exit 0
  fi
  sleep 0.5
done
```

脚本做了什么：

1. 杀旧进程 — 从 daemon.state.json 读旧 PID，先 SIGTERM 再等 5 秒，不退出就 SIGKILL

2. 清锁文件 — 删掉上次可能残留的 daemon.lock

3. 启动 daemon — 执行 happy daemon start（后台运行）

4. 等 PID 就绪 — 轮询 daemon.state.json，最多等 30 秒，拿到 PID 后写入 /run/happy-daemon.pid

5. 退出 — systemd 通过 Type=forking + PIDFile 拿到真正的 node 进程 PID，之后直接监控它

这样 systemd 就能准确追踪 daemon 进程，崩溃了也知道要重启。

## 总结

### 参考文献

1. <https://github.com/slopus/happy/tree/main/packages/happy-cli>

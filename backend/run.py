"""
run.py — Development runner for Tengen backend.

Usage:
    python run.py                  # local mode (DATA_DIR=./data, host=127.0.0.1)
    python run.py --mode docker    # docker mode (DATA_DIR=/app/data, host=0.0.0.0)
    python run.py --port 9000
    python run.py --no-reload
"""

import os
import subprocess
import sys
import argparse

MODES = {
    'local': {
        'data_dir': './data',
        'log_dir': './logs',
        'default_host': '127.0.0.1',
    },
    'docker': {
        'data_dir': '/app/data',
        'log_dir': '/app/logs',
        'default_host': '0.0.0.0',
    },
}


def parse_args():
    parser = argparse.ArgumentParser(description="Run Tengen backend with uvicorn")
    parser.add_argument(
        '--mode', default='local', choices=['local', 'docker'],
        help='Run mode: "local" (default) uses ./data; "docker" uses /app/data'
    )
    parser.add_argument('--host', default=None, help='Override bind host')
    parser.add_argument('--port', type=int, default=8000, help='Bind port (default: 8000)')
    parser.add_argument('--reload', action='store_true', default=True, help='Enable auto-reload (default: True)')
    parser.add_argument('--no-reload', dest='reload', action='store_false', help='Disable auto-reload')
    parser.add_argument('--workers', type=int, default=1, help='Worker processes (default: 1)')
    parser.add_argument('--log-level', default='info',
                        choices=['debug', 'info', 'warning', 'error', 'critical'],
                        help='Uvicorn log level (default: info)')
    return parser.parse_args()


def main():
    args = parse_args()
    mode = MODES[args.mode]

    # Resolve host: CLI override > mode default
    host = args.host or mode['default_host']

    # Reload forces single worker
    if args.reload and args.workers > 1:
        print('[run.py] Warning: --reload requires --workers 1. Forcing single worker.')
        args.workers = 1

    # Build env — inherit current env, then overlay mode-specific vars
    env = os.environ.copy()
    env.setdefault('DATA_DIR', mode['data_dir'])
    env.setdefault('LOG_DIR', mode['log_dir'])

    # Ensure data/log directories exist for local mode
    if args.mode == 'local':
        os.makedirs(mode['data_dir'], exist_ok=True)
        os.makedirs(mode['log_dir'], exist_ok=True)

    cmd = [
        sys.executable, '-m', 'uvicorn', 'main:app',
        '--host', host,
        '--port', str(args.port),
        '--log-level', args.log_level,
        '--workers', str(args.workers),
    ]
    if args.reload:
        cmd.append('--reload')

    print(f'\n[Tengen] Mode        : {args.mode}')
    print(f'[Tengen] Data dir    : {env["DATA_DIR"]}')
    print(f'[Tengen] Log dir     : {env["LOG_DIR"]}')
    print(f'[Tengen] Server      : http://{host}:{args.port}')
    print(f'[Tengen] API docs    : http://{host}:{args.port}/docs')
    print(f'[Tengen] Reload      : {args.reload}  |  Workers: {args.workers}  |  Log: {args.log_level}')
    print(f'[Tengen] Command     : {" ".join(cmd)}\n')

    try:
        result = subprocess.run(cmd, cwd=os.path.dirname(os.path.abspath(__file__)), env=env)
        sys.exit(result.returncode)
    except FileNotFoundError:
        print('[run.py] Error: uvicorn not found. Install with: pip install uvicorn')
        sys.exit(1)
    except KeyboardInterrupt:
        print('\n[run.py] Shutting down.')
        sys.exit(0)


if __name__ == '__main__':
    main()

"""Run the court checks from the repository root."""
import argparse
from functools import partial
from html.parser import HTMLParser
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import shutil
import subprocess
from threading import Thread


class InlineScripts(HTMLParser):
    def __init__(self):
        super().__init__()
        self.scripts = []
        self.active = False
        self.module = False

    def handle_starttag(self, tag, attrs):
        if tag == "script":
            attrs = dict(attrs)
            kind = attrs.get("type", "").lower()
            self.active = "src" not in attrs and kind in (
                "", "text/javascript", "application/javascript", "module"
            )
            self.module = kind == "module"

    def handle_endtag(self, tag):
        if tag == "script":
            self.active = False

    def handle_data(self, data):
        if self.active:
            self.scripts.append((self.getpos()[0], self.module, data))


def syntax():
    files = subprocess.check_output(["git", "ls-files", "-z"], text=True).split("\0")
    for name in filter(None, files):
        path = Path(name)
        if path.suffix in (".js", ".mjs"):
            subprocess.run(["node", "--check", path], check=True)
        elif path.suffix == ".html":
            parser = InlineScripts()
            parser.feed(path.read_text(encoding="utf-8"))
            parser.close()
            for line, module, code in parser.scripts:
                print(f"Checking {name} inline script at line {line}", flush=True)
                mode = "module" if module else "commonjs"
                subprocess.run(["node", "--input-type", mode, "--check"],
                               input=code, text=True, check=True)


def check_page(browser, base, dev):
    name = "dev.html" if dev else "index.html"
    with browser.new_context(viewport={"width": 960, "height": 640}) as context:
        page = context.new_page()
        errors = []
        page.on("pageerror", lambda error: errors.append(str(error)))
        page.on("requestfailed", lambda request: errors.append(
            f"{request.url}: {request.failure}") if request.resource_type == "script" else None)
        page.on("response", lambda resp: errors.append(f"{resp.status} {resp.url}")
                if resp.status >= 400 and resp.request.resource_type == "script" else None)
        try:
            page.goto(base + name, wait_until="load", timeout=60000)
            frame = page.locator("#preview").element_handle().content_frame() if dev else page
            frame.wait_for_function("""() =>
                document.querySelector('#c')?.dataset.rendered === 'true' &&
                R.info.render.calls > 0 && typeof setWorldPreviewDay === 'function' &&
                typeof vbRoamStep === 'function' && typeof vbWeatherStep === 'function' &&
                typeof vbDriftStep === 'function' && !!window.VBBoatCabin && !!window.VBCatModel
            """)
            first = frame.evaluate("R.info.render.frame")
            frame.wait_for_function("first => R.info.render.frame > first", arg=first)
            if frame.evaluate("VB_IS_DEV") != dev:
                raise RuntimeError("Unexpected save mode")
            if dev:
                page.wait_for_function("""() => ['sceneState', 'itemsState', 'roamState']
                    .every(id => document.getElementById(id).textContent === '已載入')""")
                page.select_option("#visitDay", "7")
                page.wait_for_function("() => document.querySelector('.machine-tools').open")
        finally:
            if errors:
                raise RuntimeError(f"{name}: " + "\n".join(errors))
        print(f"{name}: startup OK")


def startup():
    from playwright.sync_api import sync_playwright

    handler = partial(SimpleHTTPRequestHandler, directory=Path.cwd())
    with ThreadingHTTPServer(("127.0.0.1", 0), handler) as server, sync_playwright() as pw:
        Thread(target=server.serve_forever, daemon=True).start()
        try:
            executable = shutil.which("google-chrome") or shutil.which("chromium")
            browser = pw.chromium.launch(executable_path=executable, args=[
                "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"
            ])
            base = f"http://127.0.0.1:{server.server_port}/"
            for dev in (False, True):
                check_page(browser, base, dev)
            browser.close()
        finally:
            server.shutdown()


if __name__ == "__main__":
    args = argparse.ArgumentParser()
    args.add_argument("check", choices=["syntax", "startup"])
    if args.parse_args().check == "syntax":
        syntax()
    else:
        startup()

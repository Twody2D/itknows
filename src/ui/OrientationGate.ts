/**
 * The game is authored landscape-only: `VIRTUAL_HEIGHT` is fixed and width
 * floats 480-540 (CLAUDE.md #2). `ScaleController`'s zoom math assumes
 * width > height — in a portrait viewport it would ask for a canvas wider
 * than the screen, which `#app`'s `overflow: hidden` then silently clips.
 * Rather than let that happen, block play with an explicit rotate prompt
 * until the viewport is landscape again. Plain DOM, not a Phaser scene, so
 * it renders even if the canvas itself can't.
 */
export class OrientationGate {
  private readonly el: HTMLDivElement;

  constructor(private readonly onChange: (blocked: boolean) => void) {
    this.el = document.createElement('div');
    this.el.style.cssText = [
      'position:fixed',
      'inset:0',
      'z-index:10000',
      'display:none',
      'flex-direction:column',
      'align-items:center',
      'justify-content:center',
      'gap:14px',
      'padding:24px',
      'background:#05050a',
      'color:#f5f5ff',
      'font-family:monospace',
      'text-align:center',
    ].join(';');

    const icon = document.createElement('div');
    icon.textContent = '⟲';
    icon.style.cssText = 'font-size:48px;line-height:1;color:#4df2ff;';

    const label = document.createElement('div');
    label.style.cssText = 'font-size:14px;letter-spacing:1px;line-height:1.6;';
    label.innerHTML = 'ПОВЕРНИТЕ УСТРОЙСТВО<br>ROTATE YOUR DEVICE';

    this.el.append(icon, label);
    document.body.appendChild(this.el);

    window.addEventListener('resize', () => this.apply());
    window.addEventListener('orientationchange', () => this.apply());
    this.apply();
  }

  private apply(): void {
    const blocked = window.innerWidth < window.innerHeight;
    this.el.style.display = blocked ? 'flex' : 'none';
    this.onChange(blocked);
  }
}

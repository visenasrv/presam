/* =====================================================================
   Dapukan Musyawaroh (Penerobos Utama)
   • Dapukan (Pak Yai, Wakil Yai, Penerobos, Aghnia, …) bisa ditambah,
     diubah namanya, diurutkan, dan dihapus.
   • Anggota musyawaroh dipilih dari Data Peserta; satu orang satu dapukan.
   • Semua perubahan langsung tampil & tersimpan di HP, dikirim saat online.
   ===================================================================== */
'use strict';

Pages.dapukan = {
  focus: true, utama: true,

  mount(el) {
    el.innerHTML = '<div class="js-head"></div><div class="pad js-body"></div>' +
      '<div class="action-bar"><div class="action-bar-inner"><button class="btn btn-primary btn-block btn-lg js-add">' + ic('plus', 20) + 'Tambah Dapukan</button></div></div>';
    this.el = el;
    $('.js-add', el).onclick = () => this.form();
    el.addEventListener('click', (e) => {
      const t = e.target.closest('[data-act]');
      if (!t) return;
      const id = t.dataset.id, a = t.dataset.act;
      if (a === 'menu') this.menu(id);
      else if (a === 'pick') this.picker(id);
      else if (a === 'rm') this.removeMember(t.dataset.pid);
    });
  },
  show(el) {
    $('.js-head', el).innerHTML = UI.focusHead({ title: 'Dapukan Musyawaroh', sub: 'Anggota musyawaroh dari Data Peserta' });
    this.render();
  },
  onData() { this.render(); },

  render() {
    const list = Store.dapukanList(), ag = Store.anggotaAll();
    const by = new Map(list.map((d) => [d.id, []]));
    ag.forEach((x) => { if (by.has(x.d.id)) by.get(x.d.id).push(x.p); });
    $('.js-body', this.el).innerHTML =
      '<div class="banner info" style="margin-bottom:14px">' + ic('info', 20) + '<div>Peserta yang diberi dapukan otomatis masuk <b>daftar absen musyawaroh</b>. Satu orang satu dapukan.</div></div>' +
      (list.length ? list.map((d, i) => {
        const ms = by.get(d.id) || [];
        return '<div class="card dk-card">' +
          '<div class="card-head" style="margin-bottom:' + (ms.length ? 6 : 2) + 'px"><div style="display:flex;align-items:center;gap:10px;min-width:0"><span class="dk-no num">' + (i + 1) + '</span><h3 class="ellipsis">' + esc(d.nama) + '</h3><span class="pill sm">' + ms.length + ' orang</span></div>' +
            '<button class="icon-btn plain" data-act="menu" data-id="' + esc(d.id) + '" aria-label="Aksi dapukan ' + esc(d.nama) + '">' + ic('ellipsis-vertical', 20) + '</button></div>' +
          ms.map((p) => '<div class="list-row dk-member"><span class="avatar sm ' + p.jk + '">' + esc(Fmt.initials(p.nama)) + '</span><div class="row-main"><div class="row-title ellipsis">' + esc(p.nama) + '</div></div>' +
            '<button class="icon-btn plain" data-act="rm" data-pid="' + esc(p.id) + '" aria-label="Lepas ' + esc(p.nama) + '">' + ic('x', 18) + '</button></div>').join('') +
          '<button class="btn btn-ghost btn-block btn-sm dk-addm" data-act="pick" data-id="' + esc(d.id) + '">' + ic('user-plus', 16) + (ms.length ? 'Tambah / ubah anggota' : 'Pilih anggota dari Data Peserta') + '</button>' +
        '</div>';
      }).join('')
      : '<div class="card">' + emptyState('people', 'Belum ada dapukan', 'Tambahkan dapukan seperti Pak Yai, Wakil Yai, Penerobos, atau Aghnia.') + '</div>');
  },

  form(d) {
    Sheet.open({
      title: d ? 'Ubah Dapukan' : 'Tambah Dapukan',
      message: d ? 'Nama baru dipakai untuk musyawaroh berikutnya. Catatan musyawaroh lama tidak berubah.' : 'Contoh: Pak Yai, Wakil Yai, Penerobos, Aghnia, Sekretaris, Bendahara.',
      html: '<form id="dkForm"><div class="field"><input class="input" id="dkNama" maxlength="60" autocapitalize="words" autocomplete="off" value="' + esc(d ? d.nama : '') + '" placeholder="Nama dapukan" autofocus></div>' +
        '<div class="error-text" id="dkErr" hidden></div><div class="btn-row"><button type="button" class="btn btn-ghost" data-x>Batal</button><button class="btn btn-primary grow">' + ic('check', 18) + 'Simpan</button></div></form>',
      onMount: (el, s) => {
        $('[data-x]', el).onclick = () => s.close();
        $('#dkForm', el).onsubmit = async (e) => {
          e.preventDefault();
          const nama = $('#dkNama', el).value.replace(/\s+/g, ' ').trim(), er = $('#dkErr', el);
          if (!nama) { er.hidden = false; er.textContent = 'Nama dapukan wajib diisi.'; return; }
          if (Store.dapukanList().some((x) => x.id !== (d && d.id) && norm(x.nama) === norm(nama))) { er.hidden = false; er.textContent = 'Dapukan "' + nama + '" sudah ada.'; return; }
          await Store.saveDapukan({ id: d && d.id, nama, urut: d ? d.urut : undefined });
          s.close();
          Toast.show(d ? 'Dapukan diubah' : 'Dapukan "' + nama + '" ditambahkan');
          if (!d) setTimeout(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }), 80);
        };
      }
    });
  },

  menu(id) {
    const list = Store.dapukanList(), i = list.findIndex((d) => d.id === id), d = list[i];
    if (!d) return;
    const move = (dir) => { const ids = list.map((x) => x.id); ids.splice(i, 1); ids.splice(i + dir, 0, id); Store.reorderDapukan(ids); };
    const items = [{ icon: 'pencil', label: 'Ubah nama', onClick: () => this.form(d) }];
    if (i > 0) items.push({ icon: 'arrow-up', label: 'Pindah ke atas', onClick: () => move(-1) });
    if (i < list.length - 1) items.push({ icon: 'arrow-down', label: 'Pindah ke bawah', onClick: () => move(1) });
    items.push({ icon: 'trash-2', label: 'Hapus dapukan', danger: true, onClick: () => this.remove(d) });
    Sheet.menu({ title: d.nama, items });
  },

  async remove(d) {
    const n = Store.anggotaAll().filter((x) => x.d.id === d.id).length;
    const ok = await Sheet.confirm({
      title: 'Hapus dapukan ' + d.nama + '?',
      message: (n ? n + ' anggota dilepas dari daftar musyawaroh. ' : '') + 'Catatan kehadiran musyawaroh yang lama tetap tersimpan.',
      ok: 'Hapus', danger: true
    });
    if (!ok) return;
    await Store.deleteDapukan(d.id);
    Toast.show('Dapukan dihapus');
  },

  async removeMember(pid) {
    const p = S.peserta.get(pid), d = Store.dapukanOf(pid);
    if (!p) return;
    await Store.setAnggota([[pid, '']]);
    Toast.show(p.nama + ' dilepas dari ' + (d ? d.nama : 'musyawaroh'), 'ok', { action: 'Batal', onAction: () => d && Store.setAnggota([[pid, d.id]]) });
  },

  /** Pilih anggota dari Data Peserta untuk satu dapukan (centang banyak sekaligus). */
  picker(dkId) {
    const dk = S.dk.get(dkId);
    if (!dk) return;
    const ps = Store.pesertaAktif();
    const sel = new Set(ps.filter((p) => S.ag.has(p.id) && S.ag.get(p.id).dk === dkId).map((p) => p.id));
    const awal = new Set(sel);
    let q = '', jk = '';
    Sheet.open({
      title: 'Anggota ' + dk.nama,
      message: 'Centang peserta yang memegang dapukan ini. Peserta dari dapukan lain akan dipindahkan.',
      html: '<div class="search input-wrap" style="margin-bottom:10px">' + ic('search', 20) + '<input class="input js-pq" type="search" placeholder="Cari nama peserta…" autocomplete="off"></div>' +
        '<div class="chips js-pjk" style="margin:0 -16px 8px"></div>' +
        '<div class="pick-list js-pl"></div>' +
        '<div class="btn-row" style="margin-top:12px"><button class="btn btn-ghost" data-x>Batal</button><button class="btn btn-primary grow js-psave"></button></div>',
      onMount: (el, s) => {
        const draw = () => {
          const nL = ps.filter((p) => p.jk === 'L').length;
          $('.js-pjk', el).innerHTML = [['', 'Semua', ps.length], ['L', 'Laki-laki', nL], ['P', 'Perempuan', ps.length - nL]]
            .map((x) => '<button class="chip ' + (jk === x[0] ? 'on' : '') + '" data-jk="' + x[0] + '">' + x[1] + ' <span class="count">' + x[2] + '</span></button>').join('');
          const list = ps.filter((p) => (!jk || p.jk === jk) && (!q || norm(p.nama).indexOf(q) > -1));
          $('.js-pl', el).innerHTML = list.length ? list.map((p) => {
            const on = sel.has(p.id), other = !on && Store.dapukanOf(p.id);
            return '<button type="button" class="att-row' + (on ? ' on' : '') + '" data-pid="' + esc(p.id) + '" role="checkbox" aria-checked="' + on + '"><span class="chk">' + ic('check', 18, '', 3) + '</span>' +
              '<span class="row-main"><span class="att-name">' + esc(p.nama) + '</span>' + (other ? '<span class="att-sub"><span class="by-tag">sekarang: ' + esc(other.nama) + '</span></span>' : '') + '</span></button>';
          }).join('') : '<div class="empty" style="padding:18px 0">' + ic('search', 26, 'muted') + '<p>Peserta tidak ditemukan</p></div>';
          const add = [...sel].filter((x) => !awal.has(x)).length, del = [...awal].filter((x) => !sel.has(x)).length;
          const b = $('.js-psave', el);
          b.disabled = !add && !del;
          b.innerHTML = ic('check', 18) + (add || del ? 'Simpan' + (add ? ' +' + add : '') + (del ? ' −' + del : '') : 'Simpan (' + sel.size + ')');
        };
        $('.js-pq', el).addEventListener('input', debounce((e) => { q = norm(e.target.value); draw(); }, 80));
        el.addEventListener('click', (e) => {
          const c = e.target.closest('[data-jk]');
          if (c) { jk = c.dataset.jk; draw(); return; }
          const r = e.target.closest('.att-row');
          if (r) { const id = r.dataset.pid; sel.has(id) ? sel.delete(id) : sel.add(id); haptic(6); draw(); }
        });
        $('[data-x]', el).onclick = () => s.close();
        $('.js-psave', el).onclick = async () => {
          const ch = [];
          sel.forEach((pid) => { if (!awal.has(pid)) ch.push([pid, dkId]); });
          awal.forEach((pid) => { if (!sel.has(pid)) ch.push([pid, '']); });
          s.close();
          if (ch.length) { await Store.setAnggota(ch); Toast.show('Anggota ' + dk.nama + ' disimpan'); }
        };
        draw();
      }
    });
  }
};

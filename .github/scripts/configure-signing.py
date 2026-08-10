#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Konfigurasi signing release + versionCode di build.gradle (dipanggil GitHub Actions).

Strategi: append android{} block terpisah di akhir file — Gradle (Groovy DSL)
meng-merge beberapa android{} block, sehingga signingConfig release & versionCode
dipastikan ada tanpa tergantung template Capacitor.
"""
import os, re, sys

p = 'app/build.gradle'
s = open(p, encoding='utf-8').read()

vc = os.getenv('VC', '100')
# 1) pastikan versionCode ter-set (angka apa pun -> ganti dengan VC)
if re.search(r'versionCode\s+\d+', s):
    s = re.sub(r'versionCode\s+\d+', 'versionCode ' + vc, s, count=1)
else:
    s = s.rstrip() + '\n    versionCode ' + vc + '\n'

# 2) append signing patch block (di-merge Gradle)
patch = """

// ==== HERMES: release signing + versionCode (otomatis, jangan dihapus) ====
android {
    signingConfigs {
        release {
            storeFile file('../release.jks')
            storePassword System.getenv('KEYSTORE_PASS')
            keyAlias System.getenv('KEY_ALIAS')
            keyPassword System.getenv('KEY_PASS')
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
        }
    }
}
"""
if 'HERMES: release signing' not in s:
    s = s.rstrip() + '\n' + patch

open(p, 'w', encoding='utf-8').write(s)
print('signing config OK, versionCode=' + vc)

# verifikasi
check = open(p, encoding='utf-8').read()
assert 'HERMES: release signing' in check, 'patch block tidak ada!'
assert 'signingConfig signingConfigs.release' in check, 'signingConfig.release tidak ada!'
assert 'release.jks' in check, 'release.jks tidak ada!'
m = re.search(r'versionCode\s+(\d+)', check)
assert m and m.group(1) == vc, 'versionCode tidak sesuai: %s' % (m.group(1) if m else '?')
print('verifikasi PASS')
Pod::Spec.new do |s|
  s.name           = 'BenchmrkUI'
  s.version        = '1.0.0'
  s.summary        = 'Gestures Expo UI does not expose, for the Benchmrk app'
  s.description    = 'SwiftUI views that host Expo UI children with extra gestures.'
  s.author         = 'Benchmrk'
  s.homepage       = 'https://benchmrk.app'
  s.license        = 'AGPL-3.0-or-later'
  s.platforms      = { :ios => '16.4' }
  s.swift_version  = '5.9'
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES'
  }
  s.source_files = '**/*.swift'
end

; Appearance only. Tauri still owns install, upgrade, WebView2 and uninstall logic.
SetFont "Segoe UI" 9
!define MUI_HEADERIMAGE_RIGHT
!define MUI_HEADERIMAGE_BITMAP_STRETCH AspectFitHeight
!define MUI_HEADERIMAGE_UNBITMAP_STRETCH AspectFitHeight
!define MUI_WELCOMEFINISHPAGE_BITMAP_STRETCH AspectFitHeight
; Welcome has no standard header, so these apply to the following notice page.
!define MUI_PAGE_HEADER_TEXT "Licenses && artwork"
!define MUI_PAGE_HEADER_SUBTEXT "Software licenses and proprietary artwork information."
!define MUI_TEXTCOLOR "273247"
!define MUI_BGCOLOR "FFFFFF"
!define MUI_WELCOMEPAGE_TITLE "Welcome to Webbit"
!define MUI_WELCOMEPAGE_TEXT "This will install Webbit on your computer.$\r$\n$\r$\nClick Next to continue."
!define MUI_LICENSEPAGE_TEXT_TOP "Webbit code, proprietary artwork and third-party software notices."
!define MUI_LICENSEPAGE_TEXT_BOTTOM "License notices only. Select Next to continue."
!define MUI_LICENSEPAGE_BUTTON "&Next >"
!define MUI_DIRECTORYPAGE_TEXT_TOP "Choose where Webbit will be installed. Program Files is recommended. Your website projects are saved separately in folders you choose."
!define MUI_FINISHPAGE_TITLE "Webbit is ready"
!define MUI_FINISHPAGE_TEXT "Webbit has been installed."
!define MUI_FINISHPAGE_RUN_TEXT "Open Webbit"
!define MUI_FINISHPAGE_RUN_NOTCHECKED
!define MUI_FINISHPAGE_SHOWREADME_NOTCHECKED

/* Ease Link
 * Version: $VER$
 *
 * ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is xiaoyi.me code.
 *
 * The Initial Developer of the Original Code is Xiaoyi Shi.
 * All Rights Reserved.
 *
 * Contributor(s):
 *
 * ***** END LICENSE BLOCK ***** */

'use strict'

#include "helper.js"
#include "core.js"
#if defined(__BROWSER_FIREFOX)
#include "browsers/firefox.js"
#elif defined(__BROWSER_CHROME)
#include "browsers/chrome.js"
#elif defined(__BROWSER_SAFARI)
#include "browsers/safari.js"
#elif defined(__BROWSER_OPERA)
#include "browsers/opera.js"
#endif
#include "handlers.js"

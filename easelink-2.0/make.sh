#!/bin/sh

base="`pwd`"
source="$base"
includes="-I $source/includes"
macros=${1+"-D $1"}
target_base="$base/browsers/"
export_base="$base/exports/"

version="`cd $source && svnversion`"
version="2.0.${version##*:}"

echo "Packing Ease Link $version"
echo "Preparing files"

for browser in firefox chrome safari opera
do
  browser_macro="-D __BROWSER='${browser}' -D __BROWSER_`echo ${browser} | tr [a-z] [A-Z]`"
  target="${target_base}${browser}/"
  export="${export_base}${browser}/"
  args="-P -C -w -undef -nostdinc -imacros macro.inc $macros $browser_macro"
  
  rm -Rf $export
  for file in `cd $target && find .` ; do
    if [ -d ${target}${file} ] ; then
      mkdir -p ${export}${file}
    else
      ext=${file##*.}
      case $ext in
        js) cpp $args ${target}${file} -o ${export}${file};;
        *) cp ${target}${file} ${export}${file};;
      esac
    fi
  done
  for file in *.js ; do
    cpp $args $includes $file -o ${export}${file}
  done

done

find $export_base -type f -name '*.js' -o -name '*.json' -o -name '*.rdf' -o -name '*.plist' | xargs sed -i "s/\\\$VER\\\$/$version/g"
find $export_base -type f -name '*.js' | xargs sed -i '/^\s*;\?$/d'

cd $export_base

#firefox xpi
echo "Generating Firefox package."
cp -rf ${export_base}/firefox/* /d/Project/easelink/profile/firefox/extensions/easelink@ashi.cn/
7za a -tzip "${export_base}/easelink-${version}.xpi" ${export_base}/firefox/* -r

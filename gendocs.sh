#!/bin/sh

# todo: use grunt, because this is silly

docs_out="docs_tmp"
jsdoc="./node_modules/jsdoc/jsdoc.js" 
jsdoc_conf="jsdoc.conf"
docs_branch="gh-pages"
main_branch="master"

[ -f $jsdoc ] || (echo "jsdoc not found, run npm install" && false) || exit 1
[ -f $jsdoc_conf ] || (echo "jsdoc configuration not found" && false) || exit 1
[ -d $docs_out ] && rm -rf $docs_out

# if we're already on the docs branch, switch to master; otherwise use whatever
# we're on
hash=$(git rev-parse HEAD)
commit=$(git rev-parse --abbrev-ref HEAD)
if [ $commit == $docs_branch ]; then
    git checkout $main_branch
    [ $? -eq 0 ] || (echo "error checking out $main_branch" && false) || exit 1
fi
[ $commit == "HEAD" ] && commit=$hash

$jsdoc -c $jsdoc_conf
[ $? -eq 0 ] || (echo "jsdoc generation failed" && false) || exit 1

git checkout $docs_branch
[ $? -eq 0 ] || (echo "error checking out $docs_branch" && false) || exit 1

rm -rf docs
mv $docs_out docs
[ $? -eq 0 ] || (echo "failed to copy docs folder" && false) || exit 1

git add docs
git commit -m "generated documentation update: $hash"
[ $? -eq 0 ] || (echo "error committing new docs" && false) || exit 1

printf "\n"
echo "JSDoc documentation based on commit $hash has been committed to $docs_branch"
printf "\n"
echo "(Ignore the error about gendocs.sh being unlinkable. It's fine, it's just hacky.)"
git checkout -f $commit

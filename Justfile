# Scaffolds a worktree
scaffold issue branch:
    #!/usr/bin/env bash
    set +x
    ISSUEDESC=`gh issue view {{issue}} --json title --jq '.title'`
    git worktree add ../{{branch}} -b {{branch}}
    cd ../{{branch}}
    git commit --allow-empty -m "start work on issue {{issue}}"
    git push origin {{branch}}
    gh pr create --title "$ISSUEDESC" --body "This PR addresses issue #{{issue}}" -B main --head {{branch}}

claude issue:
    #!/usr/bin/env bash
    DESC=`gh issue view {{issue}} --json body --jq '.body'`
    echo Please resolve the following issue:
    echo
    echo ${DESC}
    echo
    echo Think hard about the best way to resolve the issue, come up with a plan and then wait for user input before proceeding.

run:
    supervisord -c supervisord.conf

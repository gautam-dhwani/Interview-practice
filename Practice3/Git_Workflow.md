# Git Workflow

## 1. Merge vs Rebase

### Explanation
Both merge and rebase integrate changes from one branch into another, but they do it differently. Merge preserves history, rebase rewrites it for a linear timeline.

### Key Concepts
- **Merge**: Combines branches, creates merge commit, preserves complete history
- **Rebase**: Replays commits on top of another branch, linear history
- **Golden Rule**: Never rebase public/shared branches

### Real-Time Example
**Writing a Book**: Merge is like having footnotes showing all edits. Rebase is like creating a clean final draft where all changes appear sequential.

### Code Block
```bash
# MERGE Example
# Start with main branch
git checkout main
# main: A - B - C

# Create feature branch
git checkout -b feature/login
# Make commits
git commit -m "Add login form"
git commit -m "Add validation"
# feature/login: A - B - C - D - E

# Meanwhile, main has new commits
# main: A - B - C - F - G

# Merge feature into main
git checkout main
git merge feature/login

# Result (preserves complete history):
# main: A - B - C - F - G - M (merge commit)
#                \         /
#                 D ----- E

# REBASE Example
# Start with same situation
# main: A - B - C - F - G
# feature/login: A - B - C - D - E

# Rebase feature onto main
git checkout feature/login
git rebase main

# Result (linear history):
# main: A - B - C - F - G
# feature/login: A - B - C - F - G - D' - E'
# (D' and E' are D and E replayed on top of G)

# Now fast-forward merge
git checkout main
git merge feature/login

# Final result (clean linear history):
# main: A - B - C - F - G - D' - E'

# Real Interview Example: Team Workflow

# 1. Pull latest changes
git checkout main
git pull origin main

# 2. Create feature branch
git checkout -b feature/user-profile

# 3. Make changes
git add .
git commit -m "Add user profile page"

# 4. More commits
git commit -m "Add profile edit functionality"

# 5. Before merging, rebase to get latest main
git fetch origin
git rebase origin/main

# If conflicts, resolve them:
# Fix conflicts in files
git add .
git rebase --continue

# If you want to abort:
# git rebase --abort

# 6. Push (force push required after rebase)
git push origin feature/user-profile --force-with-lease

# 7. Create Pull Request on GitHub

# 8. After PR approved, squash merge or regular merge
git checkout main
git merge feature/user-profile
git push origin main

# When to use MERGE:
# - Merging public branches
# - Want to preserve complete history
# - Team prefers merge commits
# - Merging long-lived branches

# When to use REBASE:
# - Cleaning up local commits before pushing
# - Want linear history
# - Syncing feature branch with main
# - Feature branch not pushed/shared yet

# NEVER rebase:
# - Public/shared branches
# - Already pushed commits that others use
```

---

## 2. Feature Branching

### Explanation
Feature branching means creating a separate branch for each feature/task. Keeps main branch stable and enables parallel development.

### Key Concepts
- **main/master**: Production-ready code
- **develop**: Integration branch (optional)
- **feature/***: New features
- **bugfix/***: Bug fixes
- **hotfix/***: Urgent production fixes

### Real-Time Example
**Restaurant Kitchen**: Main menu (main branch) stays stable. Chefs experiment with new dishes (feature branches) in separate stations. Only successful dishes added to menu.

### Code Block
```bash
# 1. Git Flow Model

# Main branches:
# - main: Production code
# - develop: Next release code

# Create develop branch
git checkout -b develop main

# 2. Feature Branch Workflow

# Start new feature
git checkout -b feature/payment-gateway develop

# Work on feature
git add .
git commit -m "Add payment API integration"
git commit -m "Add payment UI"
git commit -m "Add payment tests"

# Keep feature updated with develop
git checkout develop
git pull origin develop
git checkout feature/payment-gateway
git rebase develop

# Finish feature
git checkout develop
git merge --no-ff feature/payment-gateway
# --no-ff creates merge commit even if fast-forward possible

git branch -d feature/payment-gateway
git push origin develop

# 3. Hotfix Branch (urgent production fix)

# Critical bug in production
git checkout -b hotfix/security-patch main

# Fix the bug
git commit -m "Fix XSS vulnerability"

# Merge to both main and develop
git checkout main
git merge --no-ff hotfix/security-patch
git tag -a v1.0.1 -m "Security patch"

git checkout develop
git merge --no-ff hotfix/security-patch

git branch -d hotfix/security-patch

# 4. Release Branch

# Prepare release
git checkout -b release/v1.1.0 develop

# Only bug fixes and version bumps
git commit -m "Bump version to 1.1.0"
git commit -m "Fix typo in docs"

# Merge to main
git checkout main
git merge --no-ff release/v1.1.0
git tag -a v1.1.0 -m "Release version 1.1.0"

# Merge back to develop
git checkout develop
git merge --no-ff release/v1.1.0

git branch -d release/v1.1.0

# 5. Branch Naming Conventions

# Features
git checkout -b feature/user-authentication
git checkout -b feature/shopping-cart
git checkout -b feature/payment-integration

# Bug fixes
git checkout -b bugfix/login-error
git checkout -b bugfix/cart-calculation

# Hotfixes
git checkout -b hotfix/security-patch
git checkout -b hotfix/payment-failure

# With ticket numbers
git checkout -b feature/JIRA-123-user-profile
git checkout -b bugfix/JIRA-456-email-validation

# 6. Real Interview Example: Complete Feature Workflow

# Day 1: Start feature
git checkout main
git pull origin main
git checkout -b feature/product-search

# Make progress
git add .
git commit -m "Add search endpoint"
git push origin feature/product-search

# Day 2: Continue work
git add .
git commit -m "Add search filters"
git commit -m "Add search tests"

# Day 3: Sync with main (others have pushed changes)
git fetch origin
git rebase origin/main

# Resolve conflicts if any
# Fix conflicts
git add .
git rebase --continue

# Push (force required after rebase)
git push origin feature/product-search --force-with-lease

# Day 4: Code review feedback
git add .
git commit -m "Address code review feedback"
git push origin feature/product-search

# Day 5: Ready to merge
# Create Pull Request on GitHub
# After approval:
git checkout main
git pull origin main
git merge --no-ff feature/product-search
git push origin main

# Clean up
git branch -d feature/product-search
git push origin --delete feature/product-search
```

---

## 3. Cherry-Pick

### Explanation
Cherry-pick applies a specific commit from one branch to another. Useful for selectively applying changes without merging entire branch.

### Key Concepts
- **Selective**: Pick specific commits
- **New Commit**: Creates new commit with same changes
- **Use Case**: Hotfixes, porting features

### Real-Time Example
**Playlist**: Cherry-pick is like adding specific songs from one playlist to another, not merging entire playlists.

### Code Block
```bash
# Scenario: Bug fix in develop, need it in main urgently

# develop branch commits:
# A - B - C - D - E
#         ^
#         Bug fix (commit C)

# main branch:
# A - B - F - G

# Cherry-pick commit C to main
git checkout main
git cherry-pick C

# Result:
# main: A - B - F - G - C'
# (C' is new commit with C's changes)

# Cherry-pick multiple commits
git cherry-pick abc123 def456 ghi789

# Cherry-pick range of commits
git cherry-pick abc123..ghi789

# If conflicts occur:
# 1. Resolve conflicts
git add .
git cherry-pick --continue

# 2. Or abort
git cherry-pick --abort

# Real Interview Example: Production Hotfix

# Bug found in production (main branch)
# Fix is already in develop branch

# 1. Find the commit hash
git checkout develop
git log --oneline
# abc123 Fix payment validation bug

# 2. Apply to main
git checkout main
git cherry-pick abc123

# 3. Push to production
git push origin main

# 4. Create hotfix tag
git tag -a v1.0.1 -m "Hotfix: payment validation"
git push origin v1.0.1

# Example: Selective Feature Porting

# Feature branch has 5 commits:
# - Add user API
# - Add user UI
# - Add admin API
# - Add admin UI
# - Add tests

# Only want user-related commits in release

git log feature/user-management --oneline
# a1b2c3 Add tests
# d4e5f6 Add admin UI
# g7h8i9 Add admin API
# j0k1l2 Add user UI
# m3n4o5 Add user API

git checkout release/v1.0
git cherry-pick m3n4o5  # Add user API
git cherry-pick j0k1l2  # Add user UI
git cherry-pick a1b2c3  # Add tests
```

---

## 4. Tags

### Explanation
Tags mark specific points in history as important, typically used for releases. Unlike branches, tags don't change.

### Key Concepts
- **Lightweight**: Just a pointer to commit
- **Annotated**: Contains metadata (author, date, message)
- **Immutable**: Don't move once created
- **Semantic Versioning**: v1.2.3 (major.minor.patch)

### Real-Time Example
**Milestones**: Tags are like milestone markers on a highway - mark significant points that don't move.

### Code Block
```bash
# 1. Create Annotated Tag (recommended)
git tag -a v1.0.0 -m "Release version 1.0.0"

# 2. Create Lightweight Tag
git tag v1.0.0

# 3. Tag specific commit
git tag -a v1.0.1 abc123 -m "Hotfix release"

# 4. List tags
git tag
git tag -l "v1.*"  # List tags matching pattern

# 5. Show tag info
git show v1.0.0

# 6. Push tags to remote
git push origin v1.0.0  # Push specific tag
git push origin --tags  # Push all tags

# 7. Delete tag
git tag -d v1.0.0  # Delete local
git push origin --delete v1.0.0  # Delete remote

# 8. Checkout tag (view code at that tag)
git checkout v1.0.0
# Now in detached HEAD state

# 9. Create branch from tag
git checkout -b hotfix-v1.0.1 v1.0.0

# Real Interview Example: Release Workflow

# 1. Finish release branch
git checkout release/v2.0.0

# 2. Final version bump
echo "2.0.0" > VERSION
git commit -am "Bump version to 2.0.0"

# 3. Merge to main
git checkout main
git merge --no-ff release/v2.0.0

# 4. Tag the release
git tag -a v2.0.0 -m "Release v2.0.0 - Major update with new features"

# 5. Push to remote
git push origin main
git push origin v2.0.0

# 6. Also merge back to develop
git checkout develop
git merge --no-ff release/v2.0.0

# 7. Delete release branch
git branch -d release/v2.0.0

# Semantic Versioning Examples:
# v1.0.0 - Initial release
# v1.0.1 - Patch (bug fix)
# v1.1.0 - Minor (new features, backwards compatible)
# v2.0.0 - Major (breaking changes)

# 10. Tag Best Practices
# - Use annotated tags for releases
# - Follow semantic versioning
# - Never move/change tags
# - Include changelog in tag message
# - Tag from main branch only

# Detailed tag message
git tag -a v1.5.0 -m "Release v1.5.0

Features:
- Add payment gateway integration
- Add user profile management
- Add email notifications

Bug Fixes:
- Fix cart calculation error
- Fix login session timeout

Breaking Changes:
- API endpoint /api/users changed to /api/v2/users
"
```

---

## 5. Common Git Commands

### Explanation
Essential Git commands for daily workflow.

### Code Block
```bash
# 1. Status and Diffs
git status                    # Check working directory status
git diff                      # Show unstaged changes
git diff --staged             # Show staged changes
git diff main feature/login   # Compare branches

# 2. Stash (temporary storage)
git stash                     # Save current changes
git stash save "WIP: login"   # Save with message
git stash list                # List stashes
git stash pop                 # Apply and remove latest stash
git stash apply stash@{0}     # Apply specific stash
git stash drop stash@{0}      # Delete specific stash
git stash clear               # Delete all stashes

# 3. Undoing Changes
git checkout -- file.txt      # Discard unstaged changes
git restore file.txt          # Same as above (newer syntax)
git reset HEAD file.txt       # Unstage file
git restore --staged file.txt # Same as above (newer syntax)
git revert abc123             # Create new commit that undoes abc123
git reset --soft HEAD~1       # Undo last commit, keep changes staged
git reset --mixed HEAD~1      # Undo last commit, keep changes unstaged
git reset --hard HEAD~1       # Undo last commit, discard changes ⚠️

# 4. Viewing History
git log                       # Show commits
git log --oneline             # Compact view
git log --graph --all         # Visual branch history
git log -p                    # Show patches (diffs)
git log --author="John"       # Filter by author
git log --since="2 weeks ago" # Filter by date
git blame file.txt            # Show who changed each line

# 5. Branches
git branch                    # List local branches
git branch -a                 # List all branches (including remote)
git branch -d feature/login   # Delete branch
git branch -D feature/login   # Force delete
git branch -m old-name new-name # Rename branch

# 6. Remote Operations
git remote -v                 # List remotes
git remote add origin url     # Add remote
git fetch origin              # Download objects/refs from remote
git pull origin main          # Fetch + merge
git push origin main          # Push to remote
git push -u origin feature    # Push and set upstream

# 7. Cleaning
git clean -n                  # Show what would be deleted
git clean -f                  # Delete untracked files
git clean -fd                 # Delete untracked files and directories

# 8. Real Interview Scenarios

# Scenario 1: Accidentally committed to main
git checkout main
git reset --soft HEAD~1       # Undo commit
git stash                     # Save changes
git checkout -b feature/fix   # Create proper branch
git stash pop                 # Apply changes
git commit -m "Proper commit"

# Scenario 2: Need to switch branches but have uncommitted changes
git stash
git checkout other-branch
# Do work
git checkout original-branch
git stash pop

# Scenario 3: Committed wrong files
git reset --soft HEAD~1       # Undo commit
git restore --staged wrong-file.txt  # Unstage wrong file
git commit -m "Correct commit"

# Scenario 4: Merge conflict
git merge feature/login
# CONFLICT in app.js
# Edit app.js, resolve conflicts
git add app.js
git commit -m "Merge feature/login"

# Scenario 5: Accidentally deleted branch
git reflog                    # Find commit hash
git checkout -b recovered-branch abc123

# 9. Git Aliases (productivity boost)
git config --global alias.co checkout
git config --global alias.br branch
git config --global alias.ci commit
git config --global alias.st status
git config --global alias.lg "log --oneline --graph --all"

# Now use:
git co main
git lg
```

---

## Interview Tips

1. **Explain merge vs rebase** with diagrams
2. **Never rebase shared branches** - emphasize this
3. **Feature branching workflow** - show complete cycle
4. **Cherry-pick for hotfixes** - real scenario
5. **Semantic versioning** - v1.2.3 meaning
6. **Conflict resolution** - how to handle
7. **Git Flow model** - main, develop, feature, hotfix branches

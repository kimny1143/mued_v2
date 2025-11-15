#!/usr/bin/env python3
"""
Documentation Cleanup Script - 2025-11-15
Consolidates and reorganizes the docs directory
"""

import os
import shutil
from pathlib import Path
from typing import List, Tuple

# Define base paths
DOCS_DIR = Path("/Users/kimny/Dropbox/_DevProjects/mued/mued_v2/docs")
ARCHIVE_DIR = DOCS_DIR / "archive" / "2025-historical"

# Create archive directories
def create_archive_structure():
    """Create the consolidated archive directory structure"""
    directories = [
        "reports", "implementation", "database", "research",
        "testing", "proposals", "logs", "old-archives"
    ]
    for dir_name in directories:
        (ARCHIVE_DIR / dir_name).mkdir(parents=True, exist_ok=True)
    print(f"✓ Created archive structure at {ARCHIVE_DIR}")

# Define files to move, archive, or delete
def get_file_operations() -> Tuple[List[Tuple], List[Tuple], List[Path]]:
    """Returns lists of (source, destination) pairs for moves, and paths to delete"""

    moves_to_archive = []
    moves_to_reorganize = []
    files_to_delete = []

    # Archive old reports (except current-progress)
    reports_to_archive = [
        "DOCUMENTATION_AUDIT_2025-11-15.md",
        "DOCUMENTATION_AUDIT_2025-11-12.md",
        "DOCUMENTATION_AUDIT_2025-11-11.md",
        "DOCUMENTATION_AUDIT_REPORT_2025-10-29.md",
        "CODE_QUALITY_REPORT.md",
        "phase2-completion-report.md",
        "2025-11-07_documentation-audit-summary.md",
        "2025-11-07_pr-review-fixes.md",
        "2025-11-07_code-quality-analysis.md",
        "2025-11-07_implementation-summary.md",
        "2025-11-07_documentation-audit.md"
    ]

    for report in reports_to_archive:
        src = DOCS_DIR / "reports" / report
        if src.exists():
            moves_to_archive.append((src, ARCHIVE_DIR / "reports" / report))

    # Archive database docs
    if (DOCS_DIR / "database").exists():
        for file in (DOCS_DIR / "database").glob("*.md"):
            moves_to_archive.append((file, ARCHIVE_DIR / "database" / file.name))

    # Archive old implementation docs
    old_impl_docs = [
        "mvp-implementation-plan.md",
        "mcp-test-request.md",
        "openai-function-calling-guide.md"
    ]
    for doc in old_impl_docs:
        src = DOCS_DIR / "implementation" / doc
        if src.exists():
            moves_to_archive.append((src, ARCHIVE_DIR / "implementation" / doc))

    # Archive outdated test docs
    old_test_docs = [
        "test-implementation-final-report.md",
        "COMPONENT_TEST_IMPLEMENTATION_REPORT.md",
        "TEST_INFRASTRUCTURE_SUMMARY.md",
        "TEST_EXECUTION_GUIDE.md",
        "TROUBLESHOOTING.md",
        "NEXT_STEPS.md"
    ]
    for doc in old_test_docs:
        src = DOCS_DIR / "testing" / doc
        if src.exists():
            moves_to_archive.append((src, ARCHIVE_DIR / "testing" / doc))

    # Move entire directories to archive
    dirs_to_archive = ["proposals", "logs"]
    for dir_name in dirs_to_archive:
        src = DOCS_DIR / dir_name
        if src.exists():
            dest = ARCHIVE_DIR / dir_name
            if dest.exists():
                shutil.rmtree(dest)
            moves_to_archive.append((src, dest))

    # Archive old research (keep active ones)
    research_to_archive = [
        "ai-mentor-matching-research.md",
        "MIDI-LLM-MUED-Integration-Report.md",
        "gemini-music-generation-research.md",
        "midi-analysis-367947X.md",
        "midi-llm-debug-output.md",
        "midi-llm-issue2-response.md"
    ]
    for doc in research_to_archive:
        src = DOCS_DIR / "research" / doc
        if src.exists():
            moves_to_archive.append((src, ARCHIVE_DIR / "research" / doc))

    # Archive claude-test-materials directory
    if (DOCS_DIR / "research" / "claude-test-materials").exists():
        moves_to_archive.append(
            (DOCS_DIR / "research" / "claude-test-materials",
             ARCHIVE_DIR / "research" / "claude-test-materials")
        )

    # Files to delete
    files_to_delete = [
        DOCS_DIR / "architecture" / "mcp-feasibility-analysis.md",
        DOCS_DIR / "guides" / "with-auth-migration-guide.md",
        DOCS_DIR / "guides" / "ci-cd-github-secrets-required.md",
        DOCS_DIR / "deployment" / "github-actions-env-setup.md",
        DOCS_DIR / "deployment" / "sentry-setup.md",
        DOCS_DIR / "DOCUMENTATION_REORGANIZATION_PLAN_2025-11-15.md",
        DOCS_DIR / "DIRECTORY_STRUCTURE_AFTER_REORG.md"
    ]

    # Remove product directory if exists
    if (DOCS_DIR / "product").exists():
        files_to_delete.append(DOCS_DIR / "product")

    # Reorganize: rename prompt to prompts
    if (DOCS_DIR / "prompt").exists():
        moves_to_reorganize.append(
            (DOCS_DIR / "prompt", DOCS_DIR / "prompts")
        )

    # Move old archive folders to consolidated archive
    for archive_dir in DOCS_DIR.glob("archive/2025-*"):
        if archive_dir.name != "2025-historical":
            dest = ARCHIVE_DIR / "old-archives" / archive_dir.name
            moves_to_archive.append((archive_dir, dest))

    return moves_to_archive, moves_to_reorganize, files_to_delete

def execute_cleanup():
    """Execute the cleanup operations"""
    print("=" * 60)
    print("Documentation Cleanup - 2025-11-15")
    print("=" * 60)
    print()

    # Create archive structure
    create_archive_structure()

    # Get operations
    moves_to_archive, moves_to_reorganize, files_to_delete = get_file_operations()

    # Execute archive moves
    print("\n📦 Archiving files...")
    archived_count = 0
    for src, dest in moves_to_archive:
        try:
            if src.is_dir():
                shutil.move(str(src), str(dest))
                print(f"  ✓ Archived directory: {src.name} → archive/")
            else:
                dest.parent.mkdir(parents=True, exist_ok=True)
                shutil.move(str(src), str(dest))
                print(f"  ✓ Archived: {src.name}")
            archived_count += 1
        except Exception as e:
            print(f"  ✗ Failed to archive {src.name}: {e}")

    # Execute reorganization moves
    print("\n📂 Reorganizing directories...")
    for src, dest in moves_to_reorganize:
        try:
            if src.exists():
                shutil.move(str(src), str(dest))
                print(f"  ✓ Renamed: {src.name} → {dest.name}")
        except Exception as e:
            print(f"  ✗ Failed to reorganize {src.name}: {e}")

    # Execute deletions
    print("\n🗑️  Removing obsolete files...")
    deleted_count = 0
    for path in files_to_delete:
        try:
            if path.exists():
                if path.is_dir():
                    shutil.rmtree(path)
                    print(f"  ✓ Removed directory: {path.name}")
                else:
                    path.unlink()
                    print(f"  ✓ Removed: {path.name}")
                deleted_count += 1
        except Exception as e:
            print(f"  ✗ Failed to delete {path.name}: {e}")

    # Clean up empty directories
    print("\n🧹 Cleaning up empty directories...")
    for root, dirs, files in os.walk(DOCS_DIR, topdown=False):
        for dir_name in dirs:
            dir_path = Path(root) / dir_name
            if dir_path.exists() and not any(dir_path.iterdir()) and "archive" not in str(dir_path):
                try:
                    dir_path.rmdir()
                    print(f"  ✓ Removed empty: {dir_path.relative_to(DOCS_DIR)}")
                except:
                    pass

    # Final statistics
    print("\n" + "=" * 60)
    print("✅ Cleanup Completed Successfully!")
    print("=" * 60)

    # Count remaining files
    remaining_docs = list(DOCS_DIR.glob("**/*.md"))
    remaining_docs = [f for f in remaining_docs if "archive" not in str(f)]
    archived_docs = list(ARCHIVE_DIR.glob("**/*.md"))

    print(f"\n📊 Statistics:")
    print(f"  • Files archived: {archived_count}")
    print(f"  • Files deleted: {deleted_count}")
    print(f"  • Current docs: {len(remaining_docs)}")
    print(f"  • Archived docs: {len(archived_docs)}")

    print("\n📝 Next steps:")
    print("  1. Review the new structure")
    print("  2. Update docs/README.md")
    print("  3. Commit changes with: git add docs/ && git commit -m 'docs: comprehensive documentation cleanup and consolidation'")

if __name__ == "__main__":
    execute_cleanup()
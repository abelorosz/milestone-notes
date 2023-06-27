# Milestone Notes

This GitHub Action creates meaningful release notes based on the issues associated with a specific milestone in your repository. With it, you can automatically generate an overview of the changes included in each release when you close a milestone.

## Features

- Generates a markdown formatted release note.
- Automatically categorizes issues by labels.

## Getting Started

### Prerequisites

This action requires GitHub Actions to be set up on your repository. If you're new to GitHub Actions, see the [official GitHub documentation](https://docs.github.com/en/actions) for more information.

### Installation

```yaml
- uses: i-Cell-Mobilsoft-Open-Source/milestone-notes@master
  with:
    token: ${{ secrets.GITHUB_TOKEN }}
```

### Optional parameters

The following parameters can be used to customize the behavior of the action:

- `owner`: Github repository owner
- `repo`: Github repository name
- `labelMapping`: A JSON object that maps label names to category names. If an issue has a label that is not in the mapping, the label name will be used as the category name. The default mapping is:
```json
{
  "bug": "Bug Fixes",
  "enhancement": "New Features",
  "documentation": "Documentation",
}
```

### License

This project is licensed under the terms of the MIT License. See the [LICENSE](LICENSE) file for details.

### Support

If you encounter any problems or have suggestions, please open an issue!

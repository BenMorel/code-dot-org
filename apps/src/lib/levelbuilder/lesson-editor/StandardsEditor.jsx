import PropTypes from 'prop-types';
import React, {Component} from 'react';
import * as Table from 'reactabular-table';
import {lessonEditorTableStyles} from './TableConstants';
import color from '@cdo/apps/util/color';
import Dialog from '@cdo/apps/templates/Dialog';
import {connect} from 'react-redux';
import {
  addStandard,
  removeStandard
} from '@cdo/apps/lib/levelbuilder/lesson-editor/standardsEditorRedux';
import {standardShape} from '@cdo/apps/lib/levelbuilder/shapes';

const styles = {
  actionsColumn: {
    display: 'flex',
    justifyContent: 'space-evenly',
    backgroundColor: 'white'
  },
  remove: {
    fontSize: 14,
    color: 'white',
    background: color.dark_red,
    cursor: 'pointer',
    textAlign: 'center',
    width: 50,
    lineHeight: '30px'
  }
};

class StandardsEditor extends Component {
  static propTypes = {
    // provided by redux
    standards: PropTypes.arrayOf(standardShape).isRequired,
    addStandard: PropTypes.func.isRequired,
    removeStandard: PropTypes.func.isRequired
  };

  state = {
    standardToRemove: null,
    confirmRemovalDialogOpen: false,
    frameworkShortcode: null
  };

  actionsCellFormatter = (actions, {rowData}) => {
    return (
      <div style={styles.actionsColumn}>
        <div
          style={styles.remove}
          className="unit-test-remove-standard"
          onMouseDown={() => this.handleRemoveStandardDialogOpen(rowData)}
        >
          <i className="fa fa-trash" />
        </div>
      </div>
    );
  };

  getColumns() {
    const columns = [
      {
        property: 'frameworkName',
        header: {
          label: 'Framework',
          props: {
            style: {width: '20%'}
          }
        },
        cell: {
          props: {
            style: {
              ...lessonEditorTableStyles.cell
            }
          }
        }
      },
      {
        property: 'shortcode',
        header: {
          label: 'Shortcode',
          props: {
            style: {width: '10%'}
          }
        },
        cell: {
          props: {
            style: {
              ...lessonEditorTableStyles.cell
            }
          }
        }
      },
      {
        property: 'description',
        header: {
          label: 'Description',
          props: {
            style: {width: '63%'}
          }
        },
        cell: {
          props: {
            style: {
              ...lessonEditorTableStyles.cell
            }
          }
        }
      },
      {
        property: 'actions',
        header: {
          label: 'Actions',
          props: {
            style: {width: '7%'}
          }
        },
        cell: {
          formatters: [this.actionsCellFormatter],
          props: {
            style: {
              ...lessonEditorTableStyles.actionsCell
            }
          }
        }
      }
    ];
    return columns;
  }

  handleRemoveStandardDialogOpen = standard => {
    this.setState({standardToRemove: standard, confirmRemovalDialogOpen: true});
  };

  handleRemoveStandardDialogClose = () => {
    this.setState({standardToRemove: null, confirmRemovalDialogOpen: false});
  };

  removeStandard = () => {
    const {frameworkShortcode, shortcode} = this.state.standardToRemove;
    this.props.removeStandard(frameworkShortcode, shortcode);
    this.handleRemoveStandardDialogClose();
  };

  handleSelectFramework = e => {
    const frameworkShortcode = e.target.value;
    this.setState({frameworkShortcode});
  };

  render() {
    const columns = this.getColumns();
    return (
      <div>
        <div>Filter by framework</div>
        <select onChange={this.handleSelectFramework}>
          <option value="">(none)</option>
          <option value="iste">ISTE Standards for Students</option>
          <option value="ccela">
            Common Core English Language Arts Standards
          </option>
          <option value="ccmath">Common Core Math Standards</option>
          <option value="ngss">Next Generation Science Standards</option>
          <option value="csta">
            CSTA K-12 Computer Science Standards (2017)
          </option>
          <option value="csp2021">CSP Conceptual Framework</option>
        </select>
        <Table.Provider columns={columns}>
          <Table.Header />
          <Table.Body rows={this.props.standards} rowKey="shortcode" />
        </Table.Provider>
        {this.state.confirmRemovalDialogOpen && (
          <Dialog
            body={`Are you sure you want to remove standard "${
              this.state.standardToRemove.shortcode
            }" from this lesson?`}
            cancelText="Cancel"
            confirmText="Delete"
            confirmType="danger"
            isOpen={this.state.confirmRemovalDialogOpen}
            handleClose={this.handleRemoveStandardDialogClose}
            onCancel={this.handleRemoveStandardDialogClose}
            onConfirm={this.removeStandard}
          />
        )}
      </div>
    );
  }
}

export const UnconnectedStandardsEditor = StandardsEditor;

export default connect(
  state => ({
    standards: state.standards
  }),
  {
    addStandard,
    removeStandard
  }
)(StandardsEditor);

import React, { Component } from 'react';
import { Tabs, Tab, Typography } from '@material-ui/core';

import './createERC.css';
import RequiredMetadata from './requiredMetadata/RequiredMetadata';
//import SpatioTemporalMetadata from './spatioTemporalMetadata/SpatioTemporalMetadata';
import Bindings from './bindings/Bindings';
import httpRequests from '../../helpers/httpRequests';

function TabContainer(props) {
    return (
      <Typography component="div" style={{ padding: 8 * 3 }}>
        {props.children}
      </Typography>
    );
  }

class CreateERC extends Component {
    constructor(props) {
        super(props);
        this.state = {
            value:0,
            metadata:null,
            compendium_id: props.match.params.id, 
            codefile: null,
        }
    }

    handleChange = (evt, val) => {
        this.setState({
            value:val,
        })
    }

    getMetadata () {
        const self = this;
        httpRequests.singleCompendium(this.state.compendium_id)
            .then(function(res) {
                const metadata = res.data.metadata.o2r;
                self.setMetadata(metadata);
                //self.updateMetadata();
                httpRequests.getFile("compendium/" + self.state.compendium_id + "/data/" + metadata.mainfile)
                    .then(function( res ) {
                        self.setState({
                            codefile:res,
                        });
                    })
            })
            .catch(function (response) {
                console.log(response);
            })
    }

    setMetadata ( metadata ) {
        this.setState({
            metadata:metadata,
        });
    }

    updateMetadata = ( metadata ) => {
        const self = this;
        httpRequests.updateMetadata(self.state.compendium_id, self.state.metadata)
            .then(function(res2) {
                self.props.history.push({
                    pathname: '/erc/' + self.state.compendium_id, 
                    state: {data:self.metadata}
                });
            })
            .catch(function(res2) {
                console.log(res2)
            })
    }

    componentDidMount() {
        this.getMetadata();
    }

    render() {
        const { value } = this.state;
        return (
            <div>
                <Tabs scrollButtons="on" indicatorColor="primary" centered textColor="primary"
                    value={value}
                    onChange={this.handleChange}
                >
                    <Tab label="Required Metadata"/>
                    <Tab label="Spatiotemporal Metadata"/>
                    <Tab label="Create bindings"/>
                </Tabs>
                {value === 0 && 
                    <TabContainer>
                        {this.state.metadata!=null ?
                            <RequiredMetadata 
                                metadata={this.state.metadata} 
                            />
                        : '' }
                    </TabContainer>
                }
                {value === 1 && 
                    <TabContainer>
                        ST
                    </TabContainer>
                }
                {value === 2 && 
                    <TabContainer>
                        <Bindings 
                            metadata={this.state.metadata} 
                            codefile={this.state.codefile} 
                            compendium_id={this.state.compendium_id}
                            updateMetadata={this.updateMetadata}
                        />
                    </TabContainer>
                }
            </div>
        );
    }
}

export default CreateERC;
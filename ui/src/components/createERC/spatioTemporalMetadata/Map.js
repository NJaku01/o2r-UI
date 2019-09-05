import L from 'leaflet'
import React from 'react'
import { Map, TileLayer, FeatureGroup } from 'react-leaflet'
import { EditControl } from 'react-leaflet-draw'

let GeoJSON
let firstTime = true;
export let ref;


class OwnMap extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            metadata: props.metadata,
            drawn: true,
            GeoJSON: null
        };
    };

    componentDidMount() {
        firstTime = true;
    }

    forceRerender(){
        this.forceUpdate()
    }


    _onEdited = (e) => {


        e.layers.eachLayer((layer) => {

            GeoJSON = layer.toGeoJSON();

        });

        const metadata = this.state.metadata;

        metadata.spatial.union.bbox[0] = GeoJSON.geometry.coordinates[0][0];
        metadata.spatial.union.bbox[1] = GeoJSON.geometry.coordinates[0][1];
        metadata.spatial.union.bbox[2] = GeoJSON.geometry.coordinates[0][2];
        metadata.spatial.union.bbox[3] = GeoJSON.geometry.coordinates[0][3];
        this.props.setMetadata(metadata, false);
        this.setState({ GeoJSON: GeoJSON });
        this.props.setChanged();


    }

    _onCreated = (e) => {

        GeoJSON = e.layer.toGeoJSON();
        this.setState({ drawn: true, GeoJSON: GeoJSON });
        const metadata = this.state.metadata;

        metadata.spatial.union.bbox[0] = GeoJSON.geometry.coordinates[0][0];
        metadata.spatial.union.bbox[1] = GeoJSON.geometry.coordinates[0][1];
        metadata.spatial.union.bbox[2] = GeoJSON.geometry.coordinates[0][2];
        metadata.spatial.union.bbox[3] = GeoJSON.geometry.coordinates[0][3];
        this.props.setMetadata(metadata, false);
        this.props.setChanged();



    }

    _onDeleted = (e) => {
        this.setState({ drawn: false, GeoJSON: null });
        const metadata = this.state.metadata;

        metadata.spatial.union.bbox[0] = [181, 181]
        metadata.spatial.union.bbox[1] = [-181, 181]
        metadata.spatial.union.bbox[2] = [-181, -181]
        metadata.spatial.union.bbox[3] = [181, -181]
        this.props.setMetadata(metadata, false);
        this.props.setChanged();
    }

    _onFeatureGroupReady = (ref) => {

        if (!firstTime) {
            return;
        }
        this._editableFG = ref;
        GeoJSON = this.getGeoJson()
        const metadata = this.state.metadata;

        for (var i = 0; i < 4; i++) {
            GeoJSON.geometry.coordinates[0][i] = metadata.spatial.union.bbox[i];
        }

        GeoJSON.geometry.coordinates[0][4] = metadata.spatial.union.bbox[0];

        let leafletGeoJSON = new L.GeoJSON(GeoJSON);
        let leafletFG = this._editableFG.leafletElement;
        leafletGeoJSON.eachLayer(layer => leafletFG.addLayer(layer));
        firstTime = false;


    }

    getGeoJson = () => {
        return {
            "type": "Feature",
            "properties": {},
            "geometry": {
                "type": "Polygon",
                "coordinates": [
                    [
                        [180, 180],
                        [180, -180],
                        [-180, -180],
                        [-180, 180],
                        [180, 180]
                    ]
                ]
            }
        }
    }



    render() {
        const position = [52, 7.6]

        return (
            <Map center={position} zoom={1}>
                <TileLayer
                    attribution='&amp;copy <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <FeatureGroup ref={(reactFGref) => { this._onFeatureGroupReady(reactFGref); ref = reactFGref }}>
                    <EditControl
                        position='topright'
                        onEdited={this._onEdited}
                        onCreated={this._onCreated}
                        onDeleted={this._onDeleted}
                        edit={this.state.drawn ? { remove: true } : { remove: false }}
                        draw={this.state.drawn ? {
                            circle: false,
                            circlemarker: false,
                            marker: false,
                            polyline: false,
                            rectangle: false,
                            point: false,
                            polygon: false
                        } :
                            {
                                circle: false,
                                circlemarker: false,
                                marker: false,
                                polyline: false,
                                rectangle: true,
                                point: false,
                                polygon: false
                            }} />

                </FeatureGroup>

            </Map>);
    }
}

export default OwnMap

